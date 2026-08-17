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
    MessageSquare,
    Paperclip,
    Download,
    Send,
    FileText,
    CornerDownRight,
    Square,
    Check,
    Sparkles,
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

interface CommentItem {
    id: string;
    content: string;
    created_at: string;
    user: { id: number; name: string };
    replies?: CommentItem[];
}

interface ChecklistItem {
    id: string;
    title: string;
    is_completed: boolean;
    position: number;
    completed_at?: string | null;
    completed_by?: { id: number; name: string } | null;
}

interface AttachmentItem {
    id: string;
    filename: string;
    size_bytes: number;
    size_human: string;
    mime_type: string;
    created_at: string;
    uploader?: { id: number; name: string } | null;
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
    comments?: CommentItem[];
    checklists?: ChecklistItem[];
    attachments?: AttachmentItem[];
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
    const [estimatePoints, setEstimatePoints] = useState<string>(task.estimate_points ? String(task.estimate_points) : '');
    const [dueDate, setDueDate] = useState(task.due_date || '');
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>(
        task.assignees ? task.assignees.map((a) => a.id) : []
    );

    const [activeTab, setActiveTab] = useState('details');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Subtasks State
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);

    // Comments State
    const [newCommentContent, setNewCommentContent] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');

    // Checklist State
    const [newChecklistTitle, setNewChecklistTitle] = useState('');
    const [isAddingChecklist, setIsAddingChecklist] = useState(false);

    // AI Assistant State
    const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState(false);
    const [aiSuggestedSubtasks, setAiSuggestedSubtasks] = useState<any[] | null>(null);
    const [isGeneratingCriteria, setIsGeneratingCriteria] = useState(false);
    const [aiSuggestedCriteria, setAiSuggestedCriteria] = useState<string[] | null>(null);

    // Attachment State
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

    const handleAiTaskBreakdown = () => {
        setIsGeneratingBreakdown(true);
        setAiSuggestedSubtasks(null);

        fetch(`/projects/${projectId}/ai/task-breakdown`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title,
                description,
                type,
                priority,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.data?.suggested_subtasks) {
                    setAiSuggestedSubtasks(data.data.suggested_subtasks);
                } else {
                    alert(data.error || 'Gagal memproses dekomposisi subtask AI.');
                }
                setIsGeneratingBreakdown(false);
            })
            .catch(() => {
                alert('Terjadi kesalahan jaringan.');
                setIsGeneratingBreakdown(false);
            });
    };

    const handleApplySuggestedSubtask = (st: any) => {
        router.post(
            `/projects/${projectId}/tasks`,
            {
                parent_id: task.id,
                title: st.title,
                type: st.type || 'subtask',
                priority: st.priority || 'medium',
                estimate_points: st.estimate_points || null,
                status_id: statuses[0]?.id,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAiSuggestedSubtasks((prev) => prev ? prev.filter((item) => item.title !== st.title) : null);
                    if (onTaskUpdated) onTaskUpdated();
                },
            }
        );
    };

    const handleAiAcceptanceCriteria = () => {
        setIsGeneratingCriteria(true);
        setAiSuggestedCriteria(null);

        fetch(`/projects/${projectId}/ai/acceptance-criteria`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title,
                description,
                type,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.data?.criteria_list) {
                    setAiSuggestedCriteria(data.data.criteria_list);
                } else {
                    alert(data.error || 'Gagal menghasilkan Acceptance Criteria AI.');
                }
                setIsGeneratingCriteria(false);
            })
            .catch(() => {
                alert('Terjadi kesalahan jaringan.');
                setIsGeneratingCriteria(false);
            });
    };

    const handleApplySuggestedCriterion = (criterion: string) => {
        router.post(
            `/tasks/${task.id}/checklists`,
            { title: criterion },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAiSuggestedCriteria((prev) => prev ? prev.filter((c) => c !== criterion) : null);
                    if (onTaskUpdated) onTaskUpdated();
                },
            }
        );
    };

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setType(task.type);
            setPriority(task.priority);
            setStatusId(task.status_id);
            setEstimatePoints(task.estimate_points ? String(task.estimate_points) : '');
            setDueDate(task.due_date || '');
            setSelectedAssigneeIds(task.assignees ? task.assignees.map((a) => a.id) : []);
        }
    }, [task]);

    const handleSaveDetails = async () => {
        setIsSaving(true);
        try {
            await router.put(
                `/projects/${projectId}/tasks/${task.id}`,
                {
                    title,
                    description,
                    type,
                    priority,
                    status_id: statusId,
                    estimate_points: estimatePoints ? parseFloat(estimatePoints) : null,
                    due_date: dueDate || null,
                    assignee_ids: selectedAssigneeIds,
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
        } catch {
            setIsSaving(false);
        }
    };

    const handleQuickStatusChange = (newStatusId: string) => {
        setStatusId(newStatusId);
        router.patch(
            `/projects/${projectId}/tasks/${task.id}/move`,
            {
                status_id: newStatusId,
                version: task.version,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (onTaskUpdated) onTaskUpdated();
                },
            }
        );
    };

    const handleDeleteTask = () => {
        if (!confirm(`Hapus tugas ${task.key}? Tindakan ini tidak dapat dibatalkan.`)) return;

        setIsDeleting(true);
        router.delete(`/projects/${projectId}/tasks/${task.id}`, {
            onSuccess: () => {
                setIsDeleting(false);
                onOpenChange(false);
                if (onTaskDeleted) onTaskDeleted();
            },
            onError: () => setIsDeleting(false),
        });
    };

    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;

        setIsAddingSubtask(true);
        router.post(
            `/projects/${projectId}/tasks`,
            {
                parent_id: task.id,
                title: newSubtaskTitle,
                type: 'subtask',
                status_id: statuses[0]?.id,
                priority: 'medium',
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

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentContent.trim()) return;

        setIsPostingComment(true);
        router.post(
            `/tasks/${task.id}/comments`,
            { content: newCommentContent },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewCommentContent('');
                    setIsPostingComment(false);
                    if (onTaskUpdated) onTaskUpdated();
                },
                onError: () => setIsPostingComment(false),
            }
        );
    };

    const handlePostReply = (parentId: string) => {
        if (!replyContent.trim()) return;

        router.post(
            `/tasks/${task.id}/comments`,
            {
                content: replyContent,
                parent_id: parentId,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReplyContent('');
                    setReplyingToCommentId(null);
                    if (onTaskUpdated) onTaskUpdated();
                },
            }
        );
    };

    const handleDeleteComment = (commentId: string) => {
        if (!confirm('Hapus komentar ini?')) return;

        router.delete(`/tasks/${task.id}/comments/${commentId}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (onTaskUpdated) onTaskUpdated();
            },
        });
    };

    const handleAddChecklist = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChecklistTitle.trim()) return;

        setIsAddingChecklist(true);
        router.post(
            `/tasks/${task.id}/checklists`,
            { title: newChecklistTitle },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewChecklistTitle('');
                    setIsAddingChecklist(false);
                    if (onTaskUpdated) onTaskUpdated();
                },
                onError: () => setIsAddingChecklist(false),
            }
        );
    };

    const handleToggleChecklist = (checklistId: string) => {
        router.patch(
            `/tasks/${task.id}/checklists/${checklistId}/toggle`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (onTaskUpdated) onTaskUpdated();
                },
            }
        );
    };

    const handleDeleteChecklist = (checklistId: string) => {
        router.delete(`/tasks/${task.id}/checklists/${checklistId}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (onTaskUpdated) onTaskUpdated();
            },
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingAttachment(true);
        const formData = new FormData();
        formData.append('file', file);

        router.post(`/tasks/${task.id}/attachments`, formData, {
            preserveScroll: true,
            onSuccess: () => {
                setIsUploadingAttachment(false);
                if (onTaskUpdated) onTaskUpdated();
            },
            onError: () => setIsUploadingAttachment(false),
        });
    };

    const handleDeleteAttachment = (attachmentId: string) => {
        if (!confirm('Hapus lampiran ini?')) return;

        router.delete(`/attachments/${attachmentId}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (onTaskUpdated) onTaskUpdated();
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

    const completedChecklists = task.checklists?.filter((c) => c.is_completed) || [];
    const totalChecklists = task.checklists?.length || 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-2xl w-full p-0 overflow-y-auto border-l border-border bg-card">
                {/* Header */}
                <SheetHeader className="p-6 border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-muted">
                                {getTypeIcon(type)}
                            </span>
                            <SheetTitle className="font-mono text-sm tracking-tight text-primary font-bold">
                                {task.key}
                            </SheetTitle>
                            <Badge variant="outline" className="text-xs capitalize font-mono">
                                v{task.version}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSaveDetails}
                                disabled={isSaving}
                                className="text-xs gap-1.5 h-8 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                <Save className="h-3.5 w-3.5" />
                                <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDeleteTask}
                                disabled={isDeleting}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                title="Hapus Tugas"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Title Input */}
                    <div className="mt-4">
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="font-bold text-base bg-transparent border-transparent hover:border-border focus:border-primary px-2 -ml-2 transition-colors"
                            placeholder="Judul Tugas..."
                        />
                    </div>
                </SheetHeader>

                {/* Content Body Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Tabs Content */}
                    <div className="md:col-span-2 space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid grid-cols-5 w-full bg-muted/60 text-xs">
                                <TabsTrigger value="details">Detail</TabsTrigger>
                                <TabsTrigger value="checklists" className="gap-1">
                                    <CheckSquare className="h-3 w-3" />
                                    <span>Checklist</span>
                                </TabsTrigger>
                                <TabsTrigger value="comments" className="gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    <span>Komentar</span>
                                </TabsTrigger>
                                <TabsTrigger value="attachments" className="gap-1">
                                    <Paperclip className="h-3 w-3" />
                                    <span>Lampiran</span>
                                </TabsTrigger>
                                <TabsTrigger value="activity">Riwayat</TabsTrigger>
                            </TabsList>

                            {/* Tab 1: Details & Description */}
                            <TabsContent value="details" className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Deskripsi
                                    </label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Tambahkan penjelasan mendalam mengenai tugas ini..."
                                        className="min-h-[140px] text-xs leading-relaxed bg-background/50 resize-y"
                                    />
                                </div>

                                {/* Subtasks overview */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Layers className="h-3.5 w-3.5" />
                                            Subtasks ({task.subtasks?.length || 0})
                                        </label>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleAiTaskBreakdown}
                                            disabled={isGeneratingBreakdown}
                                            className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10 font-semibold"
                                        >
                                            <Sparkles className="size-3" />
                                            <span>{isGeneratingBreakdown ? 'Menganalisis...' : 'AI Breakdown'}</span>
                                        </Button>
                                    </div>

                                    {/* AI Suggested Subtasks Card */}
                                    {aiSuggestedSubtasks && aiSuggestedSubtasks.length > 0 && (
                                        <div className="p-3 rounded-xl border border-primary/40 bg-primary/5 space-y-2 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-primary flex items-center gap-1">
                                                    <Sparkles className="size-3.5" />
                                                    Usulan Subtask dari AI
                                                </span>
                                                <button
                                                    onClick={() => setAiSuggestedSubtasks(null)}
                                                    className="text-[10px] text-muted-foreground hover:text-foreground"
                                                >
                                                    Tutup
                                                </button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {aiSuggestedSubtasks.map((st, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/60">
                                                        <div>
                                                            <p className="font-semibold text-foreground">{st.title}</p>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {st.estimate_points ? `${st.estimate_points} SP` : ''} • Prioritas: {st.priority}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleApplySuggestedSubtask(st)}
                                                            className="h-6 text-[11px] gap-1 bg-primary text-primary-foreground"
                                                        >
                                                            <Plus className="size-3" />
                                                            Terapkan
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

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
                                    <div className="space-y-1.5">
                                        {task.subtasks && task.subtasks.map((st) => (
                                            <div key={st.id} className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20 text-xs">
                                                <span className="font-mono font-semibold text-muted-foreground">{st.key}</span>
                                                <span className="font-medium text-foreground">{st.title}</span>
                                                <Badge variant="outline" className="text-[10px]" style={{ borderColor: st.status_color }}>
                                                    {st.status_name || 'Subtask'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Tab 2: Checklists */}
                            <TabsContent value="checklists" className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-semibold">Progres Checklist:</span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleAiAcceptanceCriteria}
                                                disabled={isGeneratingCriteria}
                                                className="h-6 text-[11px] gap-1 text-primary hover:bg-primary/10 font-semibold"
                                            >
                                                <Sparkles className="size-3" />
                                                <span>{isGeneratingCriteria ? 'Membuat...' : 'AI Criteria Generator'}</span>
                                            </Button>
                                            <span className="font-mono text-primary font-bold">
                                                {completedChecklists.length} / {totalChecklists} Selesai
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-300"
                                            style={{
                                                width: `${totalChecklists > 0 ? Math.round((completedChecklists.length / totalChecklists) * 100) : 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* AI Suggested Criteria Card */}
                                {aiSuggestedCriteria && aiSuggestedCriteria.length > 0 && (
                                    <div className="p-3 rounded-xl border border-primary/40 bg-primary/5 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-primary flex items-center gap-1">
                                                <Sparkles className="size-3.5" />
                                                Usulan Acceptance Criteria (Given-When-Then)
                                            </span>
                                            <button
                                                onClick={() => setAiSuggestedCriteria(null)}
                                                className="text-[10px] text-muted-foreground hover:text-foreground"
                                            >
                                                Tutup
                                            </button>
                                        </div>
                                        <div className="space-y-1.5">
                                            {aiSuggestedCriteria.map((crit, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/60 gap-2">
                                                    <p className="text-[11px] text-foreground leading-snug flex-1">{crit}</p>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApplySuggestedCriterion(crit)}
                                                        className="h-6 text-[10px] gap-1 bg-primary text-primary-foreground shrink-0"
                                                    >
                                                        <Plus className="size-3" />
                                                        Tambah
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleAddChecklist} className="flex gap-2">
                                    <Input
                                        value={newChecklistTitle}
                                        onChange={(e) => setNewChecklistTitle(e.target.value)}
                                        placeholder="Tambah item checklist..."
                                        className="text-xs bg-background"
                                    />
                                    <Button type="submit" size="sm" disabled={isAddingChecklist || !newChecklistTitle.trim()} className="text-xs gap-1">
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah</span>
                                    </Button>
                                </form>

                                <div className="space-y-2">
                                    {task.checklists && task.checklists.length > 0 ? (
                                        task.checklists.map((ck) => (
                                            <div
                                                key={ck.id}
                                                className="group flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                                            >
                                                <div
                                                    onClick={() => handleToggleChecklist(ck.id)}
                                                    className="flex items-center gap-2.5 cursor-pointer flex-1"
                                                >
                                                    <div className={`size-4 rounded border flex items-center justify-center transition-colors ${
                                                        ck.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border bg-card'
                                                    }`}>
                                                        {ck.is_completed && <Check className="size-3 stroke-[3]" />}
                                                    </div>
                                                    <span className={`text-xs font-medium ${ck.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                        {ck.title}
                                                    </span>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteChecklist(ck.id)}
                                                    className="size-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic text-center py-6">
                                            Belum ada item checklist. Tambahkan item di atas untuk melacak langkah pengerjaan.
                                        </p>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Tab 3: Comments Stream */}
                            <TabsContent value="comments" className="space-y-4 pt-4">
                                <form onSubmit={handlePostComment} className="space-y-2">
                                    <Textarea
                                        value={newCommentContent}
                                        onChange={(e) => setNewCommentContent(e.target.value)}
                                        placeholder="Tulis komentar atau sebut rekan tim (@name)..."
                                        className="text-xs bg-background min-h-[70px]"
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={isPostingComment || !newCommentContent.trim()}
                                            className="text-xs gap-1.5 font-semibold"
                                        >
                                            <Send className="size-3.5" />
                                            <span>Kirim Komentar</span>
                                        </Button>
                                    </div>
                                </form>

                                <div className="space-y-3 pt-2">
                                    {task.comments && task.comments.length > 0 ? (
                                        task.comments.map((comment) => (
                                            <div key={comment.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-foreground">{comment.user.name}</span>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <span>{comment.created_at}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="size-5 hover:text-destructive"
                                                        >
                                                            <Trash2 className="size-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>

                                                {/* Reply button / form */}
                                                {replyingToCommentId === comment.id ? (
                                                    <div className="mt-2 pl-4 border-l-2 border-primary space-y-2">
                                                        <Input
                                                            value={replyContent}
                                                            onChange={(e) => setReplyContent(e.target.value)}
                                                            placeholder="Tulis balasan..."
                                                            className="text-xs bg-background h-8"
                                                        />
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={() => handlePostReply(comment.id)} className="h-7 text-xs">
                                                                Kirim Balasan
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => setReplyingToCommentId(null)} className="h-7 text-xs">
                                                                Batal
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReplyingToCommentId(comment.id)}
                                                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                                                    >
                                                        <CornerDownRight className="size-3" />
                                                        Balas
                                                    </button>
                                                )}

                                                {/* Nested Replies */}
                                                {comment.replies && comment.replies.length > 0 && (
                                                    <div className="pl-4 border-l-2 border-border/80 space-y-2 mt-2">
                                                        {comment.replies.map((reply) => (
                                                            <div key={reply.id} className="p-2 rounded bg-card text-xs space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-semibold text-foreground">{reply.user.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{reply.created_at}</span>
                                                                </div>
                                                                <p className="text-muted-foreground">{reply.content}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic text-center py-6">
                                            Belum ada komentar untuk tugas ini.
                                        </p>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Tab 4: Attachments */}
                            <TabsContent value="attachments" className="space-y-4 pt-4">
                                <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
                                    <Paperclip className="mx-auto size-6 text-muted-foreground mb-1" />
                                    <label className="cursor-pointer font-semibold text-xs text-primary hover:underline block">
                                        {isUploadingAttachment ? 'Mengunggah...' : 'Pilih file untuk dilampirkan'}
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={isUploadingAttachment}
                                        />
                                    </label>
                                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                                        Maksimal 25MB (Dokumen, PDF, Gambar, Zip)
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {task.attachments && task.attachments.length > 0 ? (
                                        task.attachments.map((att) => (
                                            <div
                                                key={att.id}
                                                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5 overflow-hidden">
                                                    <FileText className="size-4 text-primary shrink-0" />
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-semibold text-foreground truncate">{att.filename}</p>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {att.size_human} • {att.created_at} {att.uploader ? `oleh ${att.uploader.name}` : ''}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button asChild variant="ghost" size="icon" className="size-7 text-primary hover:bg-primary/10">
                                                        <a href={`/attachments/${att.id}/download`} download>
                                                            <Download className="size-3.5" />
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                        className="size-7 text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic text-center py-6">
                                            Belum ada file lampiran pada tugas ini.
                                        </p>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Tab 5: Activity Log */}
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
                                                    {act.action === 'comment_added' && 'Menambahkan komentar pada tugas.'}
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
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className="bg-background text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lowest">Lowest</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="highest">Highest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Type */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Tipe Tugas</label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="bg-background text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="task">Task</SelectItem>
                                    <SelectItem value="bug">Bug</SelectItem>
                                    <SelectItem value="story">Story</SelectItem>
                                    <SelectItem value="epic">Epic</SelectItem>
                                    <SelectItem value="subtask">Subtask</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Estimate Points */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Story Points</label>
                            <div className="relative">
                                <Hash className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={estimatePoints}
                                    onChange={(e) => setEstimatePoints(e.target.value)}
                                    placeholder="0"
                                    className="pl-8 text-xs bg-background"
                                />
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Tenggat Waktu</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="pl-8 text-xs bg-background"
                                />
                            </div>
                        </div>

                        {/* Assignee */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Penerima Tugas</label>
                            <Select
                                value={selectedAssigneeIds[0] ? String(selectedAssigneeIds[0]) : 'unassigned'}
                                onValueChange={(val) => {
                                    if (val === 'unassigned') {
                                        setSelectedAssigneeIds([]);
                                    } else {
                                        setSelectedAssigneeIds([parseInt(val, 10)]);
                                    }
                                }}
                            >
                                <SelectTrigger className="bg-background text-xs">
                                    <SelectValue placeholder="Belum ditugaskan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Belum Ditugaskan</SelectItem>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
