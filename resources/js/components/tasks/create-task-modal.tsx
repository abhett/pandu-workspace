import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CheckCircle2,
    Bug,
    Bookmark,
    Layers,
    Sparkles,
    Calendar,
    Users,
    Flag,
    Hash,
    Plus,
} from 'lucide-react';

interface Member {
    id: number;
    name: string;
    email: string;
}

interface WorkflowStatus {
    id: string;
    name: string;
    category: string;
    color: string;
}

interface LabelItem {
    id: string;
    name: string;
    color: string;
}

interface CreateTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    projectKey: string;
    statuses: WorkflowStatus[];
    members: Member[];
    labels?: LabelItem[];
    defaultStatusId?: string;
    parentId?: string;
    onSuccess?: () => void;
}

export function CreateTaskModal({
    open,
    onOpenChange,
    projectId,
    projectKey,
    statuses,
    members,
    labels = [],
    defaultStatusId,
    parentId,
    onSuccess,
}: CreateTaskModalProps) {
    const initialStatusId = defaultStatusId || statuses[0]?.id || '';

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        description: '',
        type: 'task',
        priority: 'medium',
        status_id: initialStatusId,
        parent_id: parentId || '',
        estimate_points: '',
        due_date: '',
        assignee_ids: [] as number[],
        label_ids: [] as string[],
    });

    const [isAiGenerating, setIsAiGenerating] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/projects/${projectId}/tasks`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
                if (onSuccess) onSuccess();
            },
        });
    };

    const toggleAssignee = (userId: number) => {
        if (data.assignee_ids.includes(userId)) {
            setData('assignee_ids', data.assignee_ids.filter((id) => id !== userId));
        } else {
            setData('assignee_ids', [...data.assignee_ids, userId]);
        }
    };

    const handleAiGenerate = () => {
        if (!data.title) {
            return;
        }
        setIsAiGenerating(true);
        setTimeout(() => {
            setData('description', `## Ringkasan Tugas: ${data.title}\n\n### Kriteria Penerimaan (Acceptance Criteria):\n- [ ] Implementasi alur utama sesuai spesifikasi\n- [ ] Validasi input dan error handling\n- [ ] Menambahkan automated unit & feature tests\n\n### Catatan Teknis:\n- Pastikan isolasi tenant dan izin role diperiksa.`);
            setIsAiGenerating(false);
        }, 600);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-6 bg-card border-border shadow-2xl">
                <DialogHeader className="border-b border-border pb-4">
                    <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
                        <Hash className="h-3.5 w-3.5" />
                        <span>{projectKey} • Buat Task Baru</span>
                    </div>
                    <DialogTitle className="text-xl font-bold tracking-tight">
                        Buat Tugas / Issue Baru
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Tambahkan item pekerjaan baru ke dalam backlog atau papan kerja proyek.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    {/* Task Type Picker */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Tipe Pekerjaan
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { id: 'task', label: 'Task', icon: CheckCircle2, color: 'text-blue-500', activeBg: 'bg-blue-500/10 border-blue-500/50 text-blue-400' },
                                { id: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500', activeBg: 'bg-red-500/10 border-red-500/50 text-red-400' },
                                { id: 'story', label: 'Story', icon: Bookmark, color: 'text-emerald-500', activeBg: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' },
                                { id: 'epic', label: 'Epic', icon: Layers, color: 'text-purple-500', activeBg: 'bg-purple-500/10 border-purple-500/50 text-purple-400' },
                            ].map((item) => {
                                const Icon = item.icon;
                                const isSelected = data.type === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setData('type', item.id)}
                                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                                            isSelected
                                                ? item.activeBg + ' ring-1 ring-primary/40 font-semibold'
                                                : 'border-border bg-background/50 hover:bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        <Icon className={`h-4 w-4 ${item.color}`} />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label htmlFor="task-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Judul Tugas <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="task-title"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="Contoh: Implementasikan sistem notifikasi real-time..."
                            className="bg-background text-sm font-medium"
                            required
                        />
                        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                    </div>

                    {/* Description with AI Generator button */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="task-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Deskripsi Detail
                            </Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleAiGenerate}
                                disabled={isAiGenerating || !data.title}
                                className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                            >
                                <Sparkles className={`h-3.5 w-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
                                <span>{isAiGenerating ? 'Menyusun deskripsi...' : 'Bantuan Pandu AI'}</span>
                            </Button>
                        </div>
                        <Textarea
                            id="task-desc"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Jelaskan ruang lingkup pekerjaan, kriteria penerimaan, dan rincian teknis..."
                            rows={5}
                            className="bg-background text-sm font-mono leading-relaxed resize-y"
                        />
                    </div>

                    {/* Meta Row: Status, Priority, Story Points, Due Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Status */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Status
                            </Label>
                            <Select
                                value={data.status_id}
                                onValueChange={(val) => setData('status_id', val)}
                            >
                                <SelectTrigger className="bg-background text-xs">
                                    <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((s) => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: s.color }}
                                                />
                                                <span>{s.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Prioritas
                            </Label>
                            <Select
                                value={data.priority}
                                onValueChange={(val) => setData('priority', val)}
                            >
                                <SelectTrigger className="bg-background text-xs">
                                    <SelectValue placeholder="Pilih prioritas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="highest" className="text-xs text-red-500 font-medium">🔴 Tertinggi (Highest)</SelectItem>
                                    <SelectItem value="high" className="text-xs text-orange-500 font-medium">🟠 Tinggi (High)</SelectItem>
                                    <SelectItem value="medium" className="text-xs text-amber-500 font-medium">🟡 Sedang (Medium)</SelectItem>
                                    <SelectItem value="low" className="text-xs text-blue-500 font-medium">🔵 Rendah (Low)</SelectItem>
                                    <SelectItem value="lowest" className="text-xs text-slate-400 font-medium">⚪ Terendah (Lowest)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Estimate Points */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Story Points
                            </Label>
                            <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                value={data.estimate_points}
                                onChange={(e) => setData('estimate_points', e.target.value)}
                                placeholder="Poin (e.g. 3, 5, 8)"
                                className="bg-background text-xs"
                            />
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Tenggat Waktu
                            </Label>
                            <Input
                                type="date"
                                value={data.due_date}
                                onChange={(e) => setData('due_date', e.target.value)}
                                className="bg-background text-xs"
                            />
                        </div>
                    </div>

                    {/* Multi-Assignees Selection */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>Anggota Bertugas (Multi-Assignees)</span>
                            <span className="text-[11px] font-normal text-muted-foreground">
                                {data.assignee_ids.length} dipilih
                            </span>
                        </Label>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-background/50 rounded-lg border border-border">
                            {members.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-1 px-2">
                                    Belum ada anggota di proyek ini.
                                </p>
                            ) : (
                                members.map((m) => {
                                    const isSelected = data.assignee_ids.includes(m.id);
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => toggleAssignee(m.id)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                    : 'bg-muted/70 hover:bg-muted text-muted-foreground border border-border/50'
                                            }`}
                                        >
                                            <span className="h-4 w-4 rounded-full bg-background/30 flex items-center justify-center text-[10px] font-bold">
                                                {m.name.charAt(0).toUpperCase()}
                                            </span>
                                            <span>{m.name}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || !data.title}
                            className="bg-primary text-primary-foreground font-semibold px-5"
                        >
                            {processing ? 'Menyimpan...' : 'Buat Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
