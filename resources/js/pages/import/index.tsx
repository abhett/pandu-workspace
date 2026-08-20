import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Bug,
    Check,
    CheckCircle2,
    Database,
    FileSpreadsheet,
    FileText,
    FolderKanban,
    Layers,
    ListTodo,
    RotateCcw,
    Sparkles,
    Trello,
    Upload,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    key: string;
    type: string;
}

interface ParsedDataPayload {
    source_type: string;
    headers: string[];
    total_rows: number;
    rows: Array<Record<string, string>>;
    sample_rows: Array<Record<string, string>>;
    suggested_mappings: Record<string, string>;
}

interface ImportResultPayload {
    job_id: string;
    project_id: string;
    project_name: string;
    total_rows: number;
    imported_rows: number;
    failed_rows: number;
    errors: Array<{ row: number; message: string }>;
    created_task_ids: string[];
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    projects: Project[];
}

export default function ImportWizard({ organization, projects }: Props) {
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

    // Step 1 State
    const [sourceType, setSourceType] = useState<string>('csv');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [rawCsvText, setRawCsvText] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Step 2 State
    const [parsedData, setParsedData] = useState<ParsedDataPayload | null>(null);
    const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

    // Step 3 State
    const [targetProjectId, setTargetProjectId] = useState<string>(projects[0]?.id || '');
    const [isProcessing, setIsProcessing] = useState(false);

    // Step 4 State
    const [importResult, setImportResult] = useState<ImportResultPayload | null>(null);

    const availablePanduFields = [
        { id: '', label: '-- Jangan Impor Kolom Ini --' },
        { id: 'title', label: 'Judul Tugas (Wajib / Required)' },
        { id: 'description', label: 'Deskripsi Tugas (Description)' },
        { id: 'priority', label: 'Prioritas (Priority: Low, Med, High, Urgent)' },
        { id: 'story_points', label: 'Estimasi Story Points' },
        { id: 'start_date', label: 'Tanggal Mulai (Start Date)' },
        { id: 'due_date', label: 'Tenggat Waktu (Due Date)' },
        { id: 'status', label: 'Status Alur Kerja (Workflow Status)' },
        { id: 'assignee', label: 'Penanggung Jawab (Assignee Name/Email)' },
        { id: 'is_milestone', label: 'Tanda Milestone (Milestone Flag)' },
    ];

    const handleUploadAndParse = (e: React.FormEvent) => {
        e.preventDefault();
        setUploadError(null);

        if (!selectedFile && !rawCsvText.trim()) {
            setUploadError('Silakan unggah file atau masukkan teks data CSV.');
            return;
        }

        setIsUploading(true);

        const formData = new FormData();
        formData.append('source_type', sourceType);
        if (selectedFile) {
            formData.append('file', selectedFile);
        } else {
            formData.append('raw_data', rawCsvText);
        }

        fetch('/import/upload', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: formData,
        })
            .then((res) => res.json())
            .then((data) => {
                setIsUploading(false);
                if (!data.success) {
                    setUploadError(data.message || 'Gagal memproses file.');
                } else {
                    setParsedData(data.data);
                    setFieldMappings(data.data.suggested_mappings || {});
                    setCurrentStep(2);
                }
            })
            .catch(() => {
                setIsUploading(false);
                setUploadError('Terjadi kesalahan koneksi server.');
            });
    };

    const handleMappingChange = (header: string, targetField: string) => {
        setFieldMappings((prev) => ({
            ...prev,
            [header]: targetField,
        }));
    };

    const applyAiSuggestedMappings = () => {
        if (parsedData?.suggested_mappings) {
            setFieldMappings(parsedData.suggested_mappings);
        }
    };

    const validateStep2 = () => {
        const isTitleMapped = Object.values(fieldMappings).includes('title');
        if (!isTitleMapped) {
            alert('Kolom "Judul Tugas (Title)" wajib dipetakan ke salah satu kolom sumber data Anda.');
            return false;
        }
        return true;
    };

    const handleExecuteImport = () => {
        if (!parsedData || !targetProjectId) return;

        setIsProcessing(true);

        fetch('/import/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                project_id: targetProjectId,
                source_type: sourceType,
                mappings: fieldMappings,
                rows: parsedData.rows,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsProcessing(false);
                if (!data.success) {
                    alert(data.message || 'Gagal mengeksekusi impor.');
                } else {
                    setImportResult(data.result);
                    setCurrentStep(4);
                }
            })
            .catch(() => {
                setIsProcessing(false);
                alert('Terjadi kesalahan saat memproses data.');
            });
    };

    const resetWizard = () => {
        setCurrentStep(1);
        setSelectedFile(null);
        setRawCsvText('');
        setParsedData(null);
        setFieldMappings({});
        setImportResult(null);
    };

    const platforms = [
        {
            id: 'jira',
            title: 'Jira Software',
            desc: 'Impor Epic, Story, Task, dan Bug dari ekspor CSV / JSON.',
            icon: Bug,
            color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
        },
        {
            id: 'trello',
            title: 'Trello Board',
            desc: 'Impor kartu board JSON Trello beserta checklist dan due date.',
            icon: Trello,
            color: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
        },
        {
            id: 'asana',
            title: 'Asana Project',
            desc: 'Impor file ekspor CSV atau JSON tugas dari Asana.',
            icon: ListTodo,
            color: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
        },
        {
            id: 'csv',
            title: 'Spreadsheet (CSV/Excel)',
            desc: 'Format tabel spreadsheet umum dengan deteksi otomatis kolom.',
            icon: FileSpreadsheet,
            color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Pusat Impor Data', href: '#' },
            ]}
        >
            <Head title={`Pusat Impor & Migrasi - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
                {/* Stepper Header */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-2 overflow-x-auto">
                        {/* Step 1 */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div
                                className={cn(
                                    'size-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors',
                                    currentStep === 1
                                        ? 'bg-primary text-primary-foreground'
                                        : currentStep > 1
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-muted text-muted-foreground'
                                )}
                            >
                                {currentStep > 1 ? <Check className="size-4" /> : '1'}
                            </div>
                            <span className={cn('text-xs font-semibold', currentStep === 1 ? 'text-foreground font-bold' : 'text-muted-foreground')}>
                                1. Pilih Sumber & Berkas
                            </span>
                        </div>

                        <div className="w-12 h-px bg-border shrink-0" />

                        {/* Step 2 */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div
                                className={cn(
                                    'size-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors',
                                    currentStep === 2
                                        ? 'bg-primary text-primary-foreground'
                                        : currentStep > 2
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-muted text-muted-foreground'
                                )}
                            >
                                {currentStep > 2 ? <Check className="size-4" /> : '2'}
                            </div>
                            <span className={cn('text-xs font-semibold', currentStep === 2 ? 'text-foreground font-bold' : 'text-muted-foreground')}>
                                2. Pemetaan Kolom
                            </span>
                        </div>

                        <div className="w-12 h-px bg-border shrink-0" />

                        {/* Step 3 */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div
                                className={cn(
                                    'size-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors',
                                    currentStep === 3
                                        ? 'bg-primary text-primary-foreground'
                                        : currentStep > 3
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-muted text-muted-foreground'
                                )}
                            >
                                {currentStep > 3 ? <Check className="size-4" /> : '3'}
                            </div>
                            <span className={cn('text-xs font-semibold', currentStep === 3 ? 'text-foreground font-bold' : 'text-muted-foreground')}>
                                3. Pratinjau & Proyek
                            </span>
                        </div>

                        <div className="w-12 h-px bg-border shrink-0" />

                        {/* Step 4 */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div
                                className={cn(
                                    'size-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors',
                                    currentStep === 4
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-muted text-muted-foreground'
                                )}
                            >
                                4
                            </div>
                            <span className={cn('text-xs font-semibold', currentStep === 4 ? 'text-foreground font-bold' : 'text-muted-foreground')}>
                                4. Laporan Hasil
                            </span>
                        </div>
                    </div>
                </div>

                {/* STEP 1: Pilih Sumber & Upload */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">Pilih Platform Asal Data</h2>
                            <p className="text-xs text-muted-foreground">
                                Pilih platform sumber data Anda untuk memulai proses migrasi tugas ke ruang kerja Pandu.
                            </p>
                        </div>

                        {/* Source Platform Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {platforms.map((p) => {
                                const Icon = p.icon;
                                const isSelected = sourceType === p.id;

                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => setSourceType(p.id)}
                                        className={cn(
                                            'p-4 rounded-2xl border bg-card cursor-pointer transition-all flex flex-col justify-between gap-4 relative shadow-xs hover:border-primary',
                                            isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={cn('size-10 rounded-xl flex items-center justify-center', p.color)}>
                                                <Icon className="size-5" />
                                            </div>
                                            {isSelected && (
                                                <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                                                    <Check className="size-3" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="font-bold text-sm text-foreground">{p.title}</h3>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">{p.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* File Upload Section */}
                        <form onSubmit={handleUploadAndParse} className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <Upload className="size-4 text-primary" /> Unggah Berkas Migrasi
                            </h3>

                            {uploadError && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium">
                                    {uploadError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-6 text-center transition-colors bg-muted/10">
                                    <Input
                                        type="file"
                                        accept=".csv,.json,.txt"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="import_file_input"
                                    />
                                    <label htmlFor="import_file_input" className="cursor-pointer space-y-2 block">
                                        <FileText className="size-8 text-muted-foreground mx-auto" />
                                        <p className="text-xs font-semibold text-foreground">
                                            {selectedFile ? selectedFile.name : 'Klik untuk memilih file CSV / JSON atau tarik berkas ke sini'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-mono">Format yang didukung: .csv, .json (Maks 10MB)</p>
                                    </label>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground">
                                        Atau Tempel (Paste) Teks CSV Mentah:
                                    </label>
                                    <Textarea
                                        value={rawCsvText}
                                        onChange={(e) => setRawCsvText(e.target.value)}
                                        placeholder="title,description,priority,story_points,due_date&#10;Implementasi API Auth,Setup token JWT,high,5,2026-09-01&#10;Desain Landing Page,Refactor hero section,medium,3,2026-09-05"
                                        rows={4}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={isUploading} className="text-xs font-semibold gap-1.5">
                                    {isUploading ? 'Memproses Berkas...' : 'Lanjutkan ke Pemetaan Kolom'}
                                    <ArrowRight className="size-3.5" />
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* STEP 2: Pemetaan Kolom */}
                {currentStep === 2 && parsedData && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-foreground">Pemetaan Kolom & Atribut</h2>
                                <p className="text-xs text-muted-foreground">
                                    Cocokkan kolom dari sumber data ({parsedData.total_rows} baris terdeteksi) ke atribut tugas Pandu.
                                </p>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={applyAiSuggestedMappings}
                                className="text-xs gap-1.5"
                            >
                                <Sparkles className="size-3.5 text-primary" />
                                <span>Terapkan Saran Otomatis</span>
                            </Button>
                        </div>

                        {/* Field Mapping Table */}
                        <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                                        <th className="py-3 px-4 font-semibold w-1/3">Kolom Sumber Data</th>
                                        <th className="py-3 px-2 w-10 text-center text-muted-foreground">→</th>
                                        <th className="py-3 px-4 font-semibold w-1/2">Atribut Tujuan di Pandu</th>
                                        <th className="py-3 px-4 font-semibold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {parsedData.headers.map((header) => {
                                        const currentMapping = fieldMappings[header] || '';
                                        const isMapped = currentMapping !== '';

                                        return (
                                            <tr key={header} className="hover:bg-muted/10 transition-colors">
                                                <td className="py-3 px-4 font-mono font-semibold text-foreground">
                                                    {header}
                                                </td>

                                                <td className="py-3 px-2 text-center text-muted-foreground">
                                                    →
                                                </td>

                                                <td className="py-3 px-4">
                                                    <select
                                                        value={currentMapping}
                                                        onChange={(e) => handleMappingChange(header, e.target.value)}
                                                        className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                                                    >
                                                        {availablePanduFields.map((f) => (
                                                            <option key={f.id} value={f.id}>
                                                                {f.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                <td className="py-3 px-4 text-right font-mono">
                                                    {isMapped ? (
                                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
                                                            Dipetakan
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                            Dilewati
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between items-center pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(1)}
                                className="text-xs gap-1.5"
                            >
                                <ArrowLeft className="size-3.5" />
                                <span>Kembali</span>
                            </Button>

                            <Button
                                onClick={() => {
                                    if (validateStep2()) {
                                        setCurrentStep(3);
                                    }
                                }}
                                className="text-xs font-semibold gap-1.5"
                            >
                                <span>Lanjutkan ke Pratinjau & Proyek</span>
                                <ArrowRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Pratinjau & Pilih Proyek */}
                {currentStep === 3 && parsedData && (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">Pilih Proyek Tujuan & Pratinjau</h2>
                            <p className="text-xs text-muted-foreground">
                                Pilih proyek penampung dan periksa 5 baris pertama data hasil pemetaan sebelum eksekusi impor.
                            </p>
                        </div>

                        {/* Project Selection */}
                        <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-3">
                            <label className="text-xs font-bold text-foreground block">
                                Proyek Tujuan Impor:
                            </label>
                            <select
                                value={targetProjectId}
                                onChange={(e) => setTargetProjectId(e.target.value)}
                                className="w-full sm:w-80 h-9 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.key})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sample Rows Preview Table */}
                        <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
                            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                                <h3 className="font-bold text-sm text-foreground">Pratinjau Data Sampel (5 Baris Pertama)</h3>
                                <span className="text-xs font-mono text-muted-foreground">Total: {parsedData.total_rows} Baris</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[10px] uppercase">
                                            <th className="py-2.5 px-4 font-semibold">#</th>
                                            {Object.entries(fieldMappings)
                                                .filter(([_, target]) => target !== '')
                                                .map(([header, target]) => (
                                                    <th key={header} className="py-2.5 px-3 font-semibold">
                                                        {target} <span className="text-muted-foreground/60">({header})</span>
                                                    </th>
                                                ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60 font-mono">
                                        {parsedData.sample_rows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-muted/10">
                                                <td className="py-2.5 px-4 text-muted-foreground">{idx + 1}</td>
                                                {Object.entries(fieldMappings)
                                                    .filter(([_, target]) => target !== '')
                                                    .map(([header, _]) => (
                                                        <td key={header} className="py-2.5 px-3 truncate max-w-[200px]">
                                                            {row[header] || '-'}
                                                        </td>
                                                    ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between items-center pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(2)}
                                className="text-xs gap-1.5"
                            >
                                <ArrowLeft className="size-3.5" />
                                <span>Kembali ke Pemetaan</span>
                            </Button>

                            <Button
                                onClick={handleExecuteImport}
                                disabled={isProcessing || !targetProjectId}
                                className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Zap className="size-3.5" />
                                <span>{isProcessing ? 'Sedang Mengimpor Tugas...' : `Mulai Impor ${parsedData.total_rows} Tugas`}</span>
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Laporan Hasil Impor */}
                {currentStep === 4 && importResult && (
                    <div className="space-y-6">
                        <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-6 text-center">
                            <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="size-8" />
                            </div>

                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">Impor Data Selesai!</h2>
                                <p className="text-xs text-muted-foreground">
                                    Data tugas telah berhasil diproses dan dimasukkan ke proyek <strong className="text-foreground">{importResult.project_name}</strong>.
                                </p>
                            </div>

                            {/* Stat Metrics */}
                            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                                <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                                    <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Total Baris</span>
                                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">{importResult.total_rows}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <span className="text-[10px] font-mono uppercase text-emerald-500 font-bold">Berhasil</span>
                                    <p className="text-xl font-bold font-mono text-emerald-500 mt-0.5">{importResult.imported_rows}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                                    <span className="text-[10px] font-mono uppercase text-red-500 font-bold">Gagal / Lewat</span>
                                    <p className="text-xl font-bold font-mono text-red-500 mt-0.5">{importResult.failed_rows}</p>
                                </div>
                            </div>

                            {/* Error Details if any */}
                            {importResult.errors.length > 0 && (
                                <div className="text-left bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
                                    <h4 className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                                        <AlertCircle className="size-3.5" /> Rincian Baris yang Dilewati:
                                    </h4>
                                    <div className="divide-y divide-red-500/10 font-mono text-[11px] text-red-400">
                                        {importResult.errors.map((err, i) => (
                                            <div key={i} className="py-1 flex justify-between">
                                                <span>Baris {err.row}:</span>
                                                <span>{err.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-center items-center gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={resetWizard}
                                    className="text-xs gap-1.5"
                                >
                                    <RotateCcw className="size-3.5" />
                                    <span>Impor File Lainnya</span>
                                </Button>

                                <Link href={`/projects/${importResult.project_id}/board`}>
                                    <Button className="text-xs font-semibold gap-1.5">
                                        <FolderKanban className="size-3.5" />
                                        <span>Buka Papan Tugas Proyek</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
