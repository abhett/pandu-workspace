import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CheckCircle2,
    Bug,
    Bookmark,
    Layers,
    Clock,
    Trash2,
    Plus,
    History,
    CheckSquare,
    Save,
    Calendar,
    Hash,
    UserCircle,
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
    is_completed?: boolean;
}

interface Subtask {
    id: string;
    key: string;
    title: string;
    priority: string;
    status_id: string;
    status_name?: string;
    status_color?: string;
    is_completed?: boolean;
    assignees?: { id: number; name: string }[];
}

interface ActivityItem {
    id: string;
    action: string;
    changes: any;
    created_at: string;
    user?: { id: number; name: string } | null;
}

export interface TaskDetailData {
    id: string;
    key: string;
    title: string;
    description: string | null;
    type: string;
    priority: string;
    status_id: string;
    estimate_points: number | null;
    due_date: string | null;
    due_date_formatted?: string | null;
    completed_at?: string | null;
    rank: string;
    version: number;
    created_at?: string;
    status: WorkflowStatus;
    assignees: Member[];
    subtasks?: Subtask[];
    activities?: ActivityItem[];
    creator?: { id: number; name: string } | null;
}

interface TaskDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    task: TaskDetailData | null;
    statuses: WorkflowStatus[];
    members: Member[];
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
}

export function TaskDetailDrawer({
    open,
    onOpenChange,
    projectId,
    task,
    statuses,
    members,
    onTaskUpdated,
    onTaskDeleted,
}: TaskDetailDrawerProps) {
    if (!task) return null;

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [type, setType] = useState(task.type);
    const [priority, setPriority] = useState(task.priority);
    const [statusId, setStatusId] = useState(task.status_id);
    const [estimatePoints, setEstimatePoints] = useState(task.estimate_points ? String(task.estimate_points) : '');
    const [dueDate, setDueDate] = useState(task.due_date || '');
    const [selectedAssignees, setSelectedAssignees] = useState<number[]>(task.assignees.map((a) => a.id));
    const [isSaving, setIsSaving] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setType(task.type);
            setPriority(task.priority);
            setStatusId(task.status_id);
            setEstimatePoints(task.estimate_points ? String(task.estimate_points) : '');
            setDueDate(task.due_date || '');
            setSelectedAssignees(task.assignees.map((a) => a.id));
        }
    }, [task]);

    const handleSaveMainDetails = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);

        router.put(
            `/projects/${projectId}/tasks/${task.id}`,
            {
                title,
                description,
                type,
                priority,
                status_id: statusId,
                estimate_points: estimatePoints !== '' ? Number(estimatePoints) : null,
                due_date: dueDate || null,
                assignee_ids: selectedAssignees,
                expected_version: task.version,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    if (onTaskUpdated) onTaskUpdated();
                },
                onError: () => {
                    setIsSaving(false);
                },
            }
        );
    };

    const handleQuickStatusChange = (newStatusId: string) => {
        setStatusId(newStatusId);
        setIsSaving(true);
        router.put(
            `/projects/${projectId}/tasks/${task.id}`,
            {
                status_id: newStatusId,
                expected_version: task.version,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    if (onTaskUpdated) onTaskUpdated();
                },
                onError: () => setIsSaving(false),
            }
        );
    };

    const toggleAssignee = (userId: number) => {
        let updated: number[];
        if (selectedAssignees.includes(userId)) {
            updated = selectedAssignees.filter((id) => id !== userId);
        } else {
            updated = [...selectedAssignees, userId];
        }
        setSelectedAssignees(updated);

        router.put(
            `/projects/${projectId}/tasks/${task.id}`,
            {
                assignee_ids: updated,
                expected_version: task.version,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (onTaskUpdated) onTaskUpdated();
                },
            }
        );
    };

    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;

        setIsAddingSubtask(true);
        router.post(
            `/projects/${projectId}/tasks`,
            {
                title: newSubtaskTitle,
                parent_id: task.id,
                type: 'subtask',
                priority: task.priority,
                status_id: task.status_id,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewSubtaskTitle('');
                    setIsAddingSubtask(false);
                    if (onTaskUpdated) onTaskUpdated();
                },
                onError: () => setIsAddingSubtask(false),
            }
        );
    };

    const handleDelete = () => {
        if (!confirm(`Hapus tugas "${task.key}: ${task.title}"?`)) return;

        router.delete(`/projects/${projectId}/tasks/${task.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                if (onTaskDeleted) onTaskDeleted();
            },
        });
    };

    const getTypeIcon = (t: string) => {
        switch (t) {
            case 'bug': return <Bug className="h-4 w-4 text-red-500" />;
            case 'story': return <Bookmark className="h-4 w-4 text-emerald-500" />;
            case 'epic': return <Layers className="h-4 w-4 text-purple-500" />;
            default: return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
        }
    };

    const getPriorityBadge = (p: string) => {
        switch (p) {
            case 'highest': return <Badge variant="destructive" className="text-[10px] uppercase font-bold">🔴 Highest</Badge>;
            case 'high': return <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30 uppercase font-bold">🟠 High</Badge>;
            case 'medium': return <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 uppercase font-bold">🟡 Medium</Badge>;
            case 'low': return <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30 uppercase font-bold">🔵 Low</Badge>;
            default: return <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-500/30 uppercase font-bold">⚪ Lowest</Badge>;
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0 bg-card border-l border-border flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-border bg-card/60 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                            {getTypeIcon(type)}
                            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {task.key}
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            {getPriorityBadge(priority)}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSaveMainDetails}
                                disabled={isSaving}
                                className="h-8 text-xs gap-1.5 font-semibold bg-primary/10 text-primary hover:bg-primary/20 border-primary/30"
                            >
                                <Save className="h-3.5 w-3.5" />
                                <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDelete}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                title="Hapus Tugas"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleSaveMainDetails}
                        className="text-lg font-bold bg-transparent border-transparent hover:border-border focus:border-primary px-2 -ml-2 transition-all"
                        placeholder="Judul Tugas..."
                    />
                </div>

                {/* Body: 2 Columns */}
                <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Tabs for Description, Subtasks, Activity */}
                    <div className="md:col-span-2 space-y-6">
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-muted/60">
                                <TabsTrigger value="details" className="text-xs">Detail</TabsTrigger>
                                <TabsTrigger value="subtasks" className="text-xs flex items-center gap-1.5">
                                    <CheckSquare className="h-3.5 w-3.5" />
                                    <span>Subtasks ({task.subtasks?.length || 0})</span>
                                </TabsTrigger>
                                <TabsTrigger value="activity" className="text-xs flex items-center gap-1.5">
                                    <History className="h-3.5 w-3.5" />
                                    <span>Riwayat</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* Tab 1: Description & Details */}
                            <TabsContent value="details" className="space-y-4 pt-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Deskripsi
                                    </label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        onBlur={handleSaveMainDetails}
                                        placeholder="Tambahkan detail deskripsi untuk tugas ini..."
                                        rows={8}
                                        className="bg-background font-mono text-sm leading-relaxed"
                                    />
                                </div>
                            </TabsContent>

                            {/* Tab 2: Subtasks */}
                            <TabsContent value="subtasks" className="space-y-4 pt-4">
                                <form onSubmit={handleAddSubtask} className="flex gap-2">
                                    <Input
                                        value={newSubtaskTitle}
                                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                        placeholder="Tambah subtask baru..."
                                        className="text-xs bg-background"
                                    />
                                    <Button type="submit" size="sm" disabled={isAddingSubtask || !newSubtaskTitle.trim()} className="text-xs gap-1">
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah</span>
                                    </Button>
                                </form>

                                <div className="space-y-2">
                                    {task.subtasks && task.subtasks.length > 0 ? (
                                        task.subtasks.map((st) => (
                                            <div
                                                key={st.id}
                                                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                                                        {st.key}
                                                    </span>
                                                    <span className="text-xs font-medium text-foreground">
                                                        {st.title}
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px]" style={{ borderColor: st.status_color }}>
                                                    {st.status_name || 'Subtask'}
                                                </Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic text-center py-6">
                                            Belum ada subtask untuk tugas ini.
                                        </p>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Tab 3: Activity Audit Log */}
                            <TabsContent value="activity" className="space-y-3 pt-4">
                                {task.activities && task.activities.length > 0 ? (
                                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                                        {task.activities.map((act) => (
                                            <div key={act.id} className="relative text-xs space-y-1">
                                                <div className="absolute -left-6 top-0.5 h-3.5 w-3.5 rounded-full bg-primary/20 border-2 border-primary" />
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-foreground">
                                                        {act.user?.name || 'Sistem'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {act.created_at}
                                                    </span>
                                                </div>
                                                <p className="text-muted-foreground">
                                                    {act.action === 'created' && 'Membuat tugas ini.'}
                                                    {act.action === 'status_changed' && `Mengubah status ke "${act.changes?.to_status_name || 'status baru'}"`}
                                                    {act.action === 'updated' && 'Memperbarui rincian tugas.'}
                                                    {act.action === 'reordered' && 'Menggeser urutan kartu di papan.'}
                                                    {act.action === 'deleted' && 'Menghapus tugas.'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic text-center py-6">
                                        Belum ada riwayat aktivitas yang tercatat.
                                    </p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Column: Properties Panel */}
                    <div className="space-y-5 p-4 rounded-xl bg-muted/30 border border-border/60">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Properti Tugas
                        </h4>

                        {/* Status */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Status</label>
                            <Select value={statusId} onValueChange={handleQuickStatusChange}>
                                <SelectTrigger className="bg-background text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((s) => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                <span>{s.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Prioritas</label>
                            <Select
                                value={priority}
                                onValueChange={(v) => {
                                    setPriority(v);
                                    router.put(`/projects/${projectId}/tasks/${task.id}`, { priority: v }, { preserveScroll: true, onSuccess: onTaskUpdated });
                                }}
                            >
                                <SelectTrigger className="bg-background text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="highest" className="text-xs text-red-500">🔴 Highest</SelectItem>
                                    <SelectItem value="high" className="text-xs text-orange-500">🟠 High</SelectItem>
                                    <SelectItem value="medium" className="text-xs text-amber-500">🟡 Medium</SelectItem>
                                    <SelectItem value="low" className="text-xs text-blue-500">🔵 Low</SelectItem>
                                    <SelectItem value="lowest" className="text-xs text-slate-400">⚪ Lowest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Story Points */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Story Points</label>
                            <Input
                                type="number"
                                step="0.5"
                                value={estimatePoints}
                                onChange={(e) => setEstimatePoints(e.target.value)}
                                onBlur={handleSaveMainDetails}
                                placeholder="0"
                                className="text-xs bg-background"
                            />
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Tenggat Waktu</label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                onBlur={handleSaveMainDetails}
                                className="text-xs bg-background"
                            />
                        </div>

                        {/* Multi-Assignees */}
                        <div className="space-y-2 pt-2 border-t border-border">
                            <label className="text-xs font-medium text-muted-foreground">Anggota Bertugas</label>
                            <div className="flex flex-wrap gap-1">
                                {members.map((m) => {
                                    const isAssigned = selectedAssignees.includes(m.id);
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => toggleAssignee(m.id)}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                                                isAssigned
                                                    ? 'bg-primary text-primary-foreground font-semibold'
                                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground border border-border/60'
                                            }`}
                                        >
                                            <span className="h-3.5 w-3.5 rounded-full bg-background/20 flex items-center justify-center text-[9px]">
                                                {m.name.charAt(0).toUpperCase()}
                                            </span>
                                            <span>{m.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Meta Info */}
                        <div className="pt-3 border-t border-border space-y-1.5 text-[11px] text-muted-foreground font-mono">
                            <div className="flex justify-between">
                                <span>Versi Concurrency:</span>
                                <span className="font-semibold text-foreground">v{task.version}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Dibuat Oleh:</span>
                                <span>{task.creator?.name || 'Sistem'}</span>
                            </div>
                            {task.created_at && (
                                <div className="flex justify-between">
                                    <span>Dibuat Pada:</span>
                                    <span>{task.created_at}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
