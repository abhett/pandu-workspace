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
    Terminal,
    Code2,
    Zap,
    KeyRound,
    Play,
    Copy,
    Check,
    BookmarkPlus,
    Trash2,
    RefreshCw,
    Send,
    Layers,
    FileCode,
    Sparkles,
    CheckCircle2,
    Sliders,
} from 'lucide-react';

interface EndpointCatalogItem {
    domain: string;
    method: string;
    path: string;
    description: string;
    sample_body: Record<string, any> | null;
}

interface PresetItem {
    id: string;
    name: string;
    method: string;
    endpoint_path: string;
    headers: Record<string, any>;
    query_params: Record<string, any>;
    request_body: Record<string, any>;
    created_by_name: string;
    created_at_formatted: string;
}

interface Metrics {
    total_endpoints: number;
    supported_languages: number;
    avg_latency_ms: number;
    active_api_tokens: number;
    api_base_url: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    endpointsCatalog: EndpointCatalogItem[];
    presets: PresetItem[];
}

export default function ApiPlaygroundPage({
    organization,
    metrics,
    endpointsCatalog,
    presets,
}: Props) {
    const [selectedMethod, setSelectedMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
    const [endpointPath, setEndpointPath] = useState('/v1/tasks');
    const [requestBodyText, setRequestBodyText] = useState('{\n  "status": "in_progress",\n  "limit": 20\n}');
    const [isExecuting, setIsExecuting] = useState(false);

    // Response State
    const [responseStatus, setResponseStatus] = useState<number | null>(200);
    const [responseLatency, setResponseLatency] = useState<number>(24);
    const [responsePayload, setResponsePayload] = useState<any>({
        status: 'success',
        code: 200,
        data: {
            tasks: [
                { id: 'tsk-101', title: 'Optimize Postgres Query Indexing', status: 'in_progress', priority: 'high' },
                { id: 'tsk-102', title: 'Implement PDP Data Residency Redaction', status: 'completed', priority: 'critical' },
            ],
            meta: {
                total: 2,
                page: 1,
                latency_ms: 24,
            },
        },
    });

    // SDK Snippets
    const [activeSdkTab, setActiveSdkTab] = useState<'curl' | 'javascript' | 'python' | 'go' | 'php'>('curl');
    const [sdkSnippets, setSdkSnippets] = useState<Record<string, string>>({
        curl: 'curl -X GET "https://api.pandu.app/v1/tasks" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json"',
        javascript: 'const response = await fetch("https://api.pandu.app/v1/tasks", {\n  headers: { "Authorization": "Bearer YOUR_API_KEY" }\n});\nconst data = await response.json();',
        python: 'import requests\n\nres = requests.get("https://api.pandu.app/v1/tasks", headers={"Authorization": "Bearer YOUR_API_KEY"})\nprint(res.json())',
        go: 'package main\n\nimport (\n\t"fmt"\n\t"net/http"\n\t"io"\n)\n\nfunc main() {\n\treq, _ := http.NewRequest("GET", "https://api.pandu.app/v1/tasks", nil)\n\treq.Header.Add("Authorization", "Bearer YOUR_API_KEY")\n\tres, _ := http.DefaultClient.Do(req)\n\tbody, _ := io.ReadAll(res.Body)\n\tfmt.Println(string(body))\n}',
        php: '<?php\n\nuse GuzzleHttp\\Client;\n\n$client = new Client();\n$res = $client->request("GET", "https://api.pandu.app/v1/tasks", [\n  "headers" => ["Authorization" => "Bearer YOUR_API_KEY"]\n]);\necho $res->getBody();',
    });

    const [activeRightTab, setActiveRightTab] = useState<'response' | 'sdk'>('response');
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedResponse, setCopiedResponse] = useState(false);

    // Save Preset Modal
    const [presetModalOpen, setPresetModalOpen] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [isSavingPreset, setIsSavingPreset] = useState(false);

    const handleSelectCatalogEndpoint = (item: EndpointCatalogItem) => {
        setSelectedMethod(item.method as any);
        setEndpointPath(item.path);
        if (item.sample_body) {
            setRequestBodyText(JSON.stringify(item.sample_body, null, 2));
        } else {
            setRequestBodyText('');
        }
    };

    const handleFormatJson = () => {
        try {
            if (requestBodyText.trim()) {
                const parsed = JSON.parse(requestBodyText);
                setRequestBodyText(JSON.stringify(parsed, null, 2));
            }
        } catch {
            alert('Format JSON tidak valid.');
        }
    };

    const handleExecuteRequest = () => {
        setIsExecuting(true);
        let parsedBody = {};
        if (requestBodyText.trim() && selectedMethod !== 'GET') {
            try {
                parsedBody = JSON.parse(requestBodyText);
            } catch {
                alert('Request body JSON tidak valid.');
                setIsExecuting(false);
                return;
            }
        }

        fetch('/organization/developer/api-playground/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                method: selectedMethod,
                endpoint_path: endpointPath,
                headers: { 'Content-Type': 'application/json' },
                request_body: parsedBody,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsExecuting(false);
                if (data.success && data.execution) {
                    setResponseStatus(data.execution.status_code);
                    setResponseLatency(data.execution.latency_ms);
                    setResponsePayload(data.execution.response_payload);
                    setSdkSnippets(data.execution.snippets);
                }
            })
            .catch(() => setIsExecuting(false));
    };

    const handleCopyCode = () => {
        const snippet = sdkSnippets[activeSdkTab] || '';
        navigator.clipboard.writeText(snippet);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyResponse = () => {
        navigator.clipboard.writeText(JSON.stringify(responsePayload, null, 2));
        setCopiedResponse(true);
        setTimeout(() => setCopiedResponse(false), 2000);
    };

    const handleSavePresetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPreset(true);
        let parsedBody = {};
        if (requestBodyText.trim() && selectedMethod !== 'GET') {
            try {
                parsedBody = JSON.parse(requestBodyText);
            } catch {
                parsedBody = {};
            }
        }

        fetch('/organization/developer/api-playground/presets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: presetName,
                method: selectedMethod,
                endpoint_path: endpointPath,
                headers: { 'Content-Type': 'application/json' },
                request_body: parsedBody,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingPreset(false);
                setPresetModalOpen(false);
                setPresetName('');
                router.reload();
            })
            .catch(() => setIsSavingPreset(false));
    };

    const handleLoadPreset = (preset: PresetItem) => {
        setSelectedMethod(preset.method as any);
        setEndpointPath(preset.endpoint_path);
        if (preset.request_body && Object.keys(preset.request_body).length > 0) {
            setRequestBodyText(JSON.stringify(preset.request_body, null, 2));
        } else {
            setRequestBodyText('');
        }
    };

    const handleDeletePreset = (preset: PresetItem) => {
        if (!confirm(`Hapus preset "${preset.name}"?`)) return;

        fetch(`/organization/developer/api-playground/presets/${preset.id}`, {
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

    const getMethodColor = (m: string) => {
        switch (m) {
            case 'GET':
                return 'bg-blue-600 text-white';
            case 'POST':
                return 'bg-emerald-600 text-white';
            case 'PUT':
                return 'bg-amber-600 text-white';
            case 'DELETE':
                return 'bg-rose-600 text-white';
            default:
                return 'bg-muted text-foreground';
        }
    };

    return (
        <AppLayout>
            <Head title="Interactive API Playground & Multi-Language SDK Generator Studio" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md">
                            <Terminal className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Developer API Playground &amp; SDK Studio
                                </h1>
                                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs font-mono">
                                    REST v1 Sandbox
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Eksplorasi REST API interaktif, pengujian live sandbox, dan generator kode SDK multi-bahasa (cURL, TS, Python, Go, PHP)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-muted text-muted-foreground border-border text-xs font-mono px-2.5 py-1">
                            Base URL: {metrics.api_base_url}
                        </Badge>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setPresetName(`${selectedMethod} ${endpointPath}`);
                                setPresetModalOpen(true);
                            }}
                            className="h-9 text-xs gap-1.5 font-semibold"
                        >
                            <BookmarkPlus className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Simpan Preset</span>
                        </Button>

                        <Button
                            size="sm"
                            disabled={isExecuting}
                            onClick={handleExecuteRequest}
                            className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>{isExecuting ? 'Mengeksekusi...' : 'Eksekusi Permintaan'}</span>
                        </Button>
                    </div>
                </div>

                {/* Top Developer Metrics Bento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Endpoints */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Endpoint REST API</span>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Terminal className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_endpoints}
                            </span>
                            <span className="text-xs text-muted-foreground">Endpoint</span>
                            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-[10px]">
                                OpenAPI Ready
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Tasks, Projects, Releases, Privacy
                        </div>
                    </div>

                    {/* Supported SDK Languages */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Bahasa SDK Didukung</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Code2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono">
                                {metrics.supported_languages}
                            </span>
                            <span className="text-xs text-muted-foreground">Bahasa</span>
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                                Auto Gen
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            cURL, TypeScript, Python, Go, PHP
                        </div>
                    </div>

                    {/* Latency */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Latensi Gateway</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Zap className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                ~{metrics.avg_latency_ms} ms
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                P99 Optimal
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Multi-region Jakarta &amp; Frankfurt
                        </div>
                    </div>

                    {/* Active API Tokens */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Token API Organisasi</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <KeyRound className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.active_api_tokens}
                            </span>
                            <span className="text-xs text-muted-foreground">Token Aktif</span>
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                                Scoped
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Autentikasi Bearer Header terenkripsi
                        </div>
                    </div>
                </div>

                {/* Main Two-Column Interactive API Studio */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Request Builder */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Send className="h-4 w-4 text-indigo-600" />
                                <span>Konfigurasi Permintaan (Request Builder)</span>
                            </h3>

                            {/* Predefined Endpoints Catalog Selector */}
                            <Select onValueChange={(val) => {
                                const found = endpointsCatalog.find((e) => `${e.method} ${e.path}` === val);
                                if (found) handleSelectCatalogEndpoint(found);
                            }}>
                                <SelectTrigger className="h-8 text-xs w-48 font-mono">
                                    <SelectValue placeholder="Pilih Template Endpoint" />
                                </SelectTrigger>
                                <SelectContent>
                                    {endpointsCatalog.map((ep, idx) => (
                                        <SelectItem key={idx} value={`${ep.method} ${ep.path}`} className="text-xs font-mono">
                                            [{ep.method}] {ep.path}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Method & Path Bar */}
                        <div className="flex items-center gap-2">
                            <Select value={selectedMethod} onValueChange={(val: any) => setSelectedMethod(val)}>
                                <SelectTrigger className={`h-10 w-28 text-xs font-bold font-mono ${getMethodColor(selectedMethod)} border-0`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET" className="font-mono text-xs font-bold text-blue-600">GET</SelectItem>
                                    <SelectItem value="POST" className="font-mono text-xs font-bold text-emerald-600">POST</SelectItem>
                                    <SelectItem value="PUT" className="font-mono text-xs font-bold text-amber-600">PUT</SelectItem>
                                    <SelectItem value="DELETE" className="font-mono text-xs font-bold text-rose-600">DELETE</SelectItem>
                                </SelectContent>
                            </Select>

                            <Input
                                value={endpointPath}
                                onChange={(e) => setEndpointPath(e.target.value)}
                                placeholder="/v1/tasks"
                                className="h-10 text-xs font-mono font-semibold"
                            />
                        </div>

                        {/* Request Headers Note */}
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1">
                            <span className="font-bold text-foreground block">Header Permintaan:</span>
                            <div className="font-mono text-[11px] text-muted-foreground space-y-0.5">
                                <div>Authorization: <span className="text-indigo-600">Bearer pandu_sec_live_sandbox_token</span></div>
                                <div>Content-Type: <span className="text-foreground">application/json</span></div>
                            </div>
                        </div>

                        {/* Request Body Editor */}
                        {selectedMethod !== 'GET' && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="font-semibold text-xs text-foreground block">
                                        Request Body (JSON Payload)
                                    </label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleFormatJson}
                                        className="h-6 text-[10px] text-indigo-600"
                                    >
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        <span>Format JSON</span>
                                    </Button>
                                </div>

                                <Textarea
                                    value={requestBodyText}
                                    onChange={(e) => setRequestBodyText(e.target.value)}
                                    className="font-mono text-xs min-h-[160px] bg-muted/20"
                                    placeholder='{ "title": "Example payload" }'
                                />
                            </div>
                        )}

                        <div className="pt-2">
                            <Button
                                type="button"
                                disabled={isExecuting}
                                onClick={handleExecuteRequest}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5 h-10"
                            >
                                <Play className="h-4 w-4 fill-current" />
                                <span>{isExecuting ? 'Mengeksekusi Sandbox...' : 'Kirim Permintaan (Send Request)'}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Live Response Viewer & Multi-Language SDK Generator */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                        {/* Tab Switcher */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-1.5 text-xs">
                                <button
                                    onClick={() => setActiveRightTab('response')}
                                    className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                                        activeRightTab === 'response'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Respons Live Sandbox</span>
                                </button>

                                <button
                                    onClick={() => setActiveRightTab('sdk')}
                                    className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                                        activeRightTab === 'sdk'
                                            ? 'bg-purple-600 text-white shadow-xs'
                                            : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Code2 className="h-3.5 w-3.5" />
                                    <span>Generator SDK Kode</span>
                                </button>
                            </div>

                            {activeRightTab === 'response' ? (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCopyResponse}
                                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                                >
                                    {copiedResponse ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                    <span>{copiedResponse ? 'Tersalin' : 'Salin JSON'}</span>
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCopyCode}
                                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                                >
                                    {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                    <span>{copiedCode ? 'Tersalin' : 'Salin Kode'}</span>
                                </Button>
                            )}
                        </div>

                        {/* View 1: Response Viewer */}
                        {activeRightTab === 'response' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-mono">
                                    <div className="flex items-center gap-2">
                                        <Badge className={`text-xs font-mono ${responseStatus && responseStatus < 300 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                            {responseStatus} OK
                                        </Badge>
                                        <span className="text-muted-foreground">Waktu: <strong className="text-foreground">{responseLatency}ms</strong></span>
                                    </div>
                                    <span className="text-muted-foreground">application/json</span>
                                </div>

                                <div className="rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs overflow-x-auto max-h-[360px] text-foreground leading-relaxed">
                                    <pre>{JSON.stringify(responsePayload, null, 2)}</pre>
                                </div>
                            </div>
                        )}

                        {/* View 2: Multi-Language SDK Generator */}
                        {activeRightTab === 'sdk' && (
                            <div className="space-y-3">
                                {/* SDK Language Select Pills */}
                                <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1">
                                    {(['curl', 'javascript', 'python', 'go', 'php'] as const).map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => setActiveSdkTab(lang)}
                                            className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-all uppercase font-semibold ${
                                                activeSdkTab === lang
                                                    ? 'bg-purple-600 text-white shadow-xs'
                                                    : 'bg-muted/40 text-muted-foreground hover:text-foreground border border-border'
                                            }`}
                                        >
                                            {lang === 'javascript' ? 'TS / JS Fetch' : lang}
                                        </button>
                                    ))}
                                </div>

                                <div className="rounded-xl border border-border bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto max-h-[360px] leading-relaxed">
                                    <pre>{sdkSnippets[activeSdkTab]}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Saved Collections / Presets Table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs space-y-3 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <BookmarkPlus className="h-4 w-4 text-indigo-600" />
                                <span>Koleksi Preset Permintaan API Tersimpan</span>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Preset konfigurasi endpoint yang dapat dimuat kembali secara instan oleh seluruh anggota tim developer
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                    <th className="p-3">Nama Preset</th>
                                    <th className="p-3">Method</th>
                                    <th className="p-3">Endpoint Path</th>
                                    <th className="p-3">Pembuat</th>
                                    <th className="p-3">Dibuat</th>
                                    <th className="p-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {presets.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            Belum ada preset tersimpan.
                                        </td>
                                    </tr>
                                ) : (
                                    presets.map((preset) => (
                                        <tr key={preset.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-3 font-bold text-foreground">
                                                {preset.name}
                                            </td>

                                            <td className="p-3">
                                                <Badge className={`text-[10px] font-mono ${getMethodColor(preset.method)}`}>
                                                    {preset.method}
                                                </Badge>
                                            </td>

                                            <td className="p-3 font-mono text-foreground font-semibold">
                                                {preset.endpoint_path}
                                            </td>

                                            <td className="p-3 text-muted-foreground">
                                                {preset.created_by_name}
                                            </td>

                                            <td className="p-3 text-muted-foreground font-mono">
                                                {preset.created_at_formatted}
                                            </td>

                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleLoadPreset(preset)}
                                                        className="h-6 text-[10px] px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                                    >
                                                        <span>Muat ke Konsol</span>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeletePreset(preset)}
                                                        className="h-6 w-6 p-0 text-rose-500"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
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

            {/* Modal: Simpan Preset Permintaan */}
            <Dialog open={presetModalOpen} onOpenChange={setPresetModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-600">
                            <BookmarkPlus className="h-5 w-5" />
                            <span>Simpan Preset Permintaan API</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Simpan konfigurasi endpoint saat ini ke dalam koleksi preset organisasi.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSavePresetSubmit} className="space-y-3 pt-2 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Nama Preset *
                            </label>
                            <Input
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                placeholder="Contoh: Create Bug Incident Alert"
                                className="text-xs"
                                required
                            />
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs font-mono space-y-1">
                            <div>Method: <strong className="text-indigo-600">{selectedMethod}</strong></div>
                            <div>Path: <strong className="text-foreground">{endpointPath}</strong></div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPresetModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingPreset}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                            >
                                {isSavingPreset ? 'Menyimpan...' : 'Simpan ke Koleksi'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
