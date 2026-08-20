import React, { useState, useRef, useEffect } from 'react';
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
    StickyNote,
    Lightbulb,
    Square,
    Workflow,
    Plus,
    Trash2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Check,
    X,
    Move,
    ArrowRight,
    PenTool,
    Sparkles,
    Columns3,
    ListTodo,
    DollarSign,
    Settings,
    Layers,
    Grid,
    CircleDot,
    Share2,
    AlertTriangle,
    CheckCircle2,
    Palette,
    Edit3,
    Radio,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
    slug: string;
    color: string;
    icon: string;
}

interface WhiteboardMeta {
    id: string;
    title: string;
    description?: string | null;
    viewport_x: number;
    viewport_y: number;
    viewport_zoom: number;
    grid_type: string;
    is_favorite: boolean;
}

interface NodeTask {
    id: string;
    key: string;
    title: string;
    priority: string;
    type: string;
    status_name?: string;
    status_color?: string;
}

interface CanvasNode {
    id: string;
    type: 'sticky_note' | 'idea_card' | 'shape' | 'text_block';
    title?: string | null;
    content?: string | null;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    color: string;
    task_id?: string | null;
    task?: NodeTask | null;
    meta?: Record<string, any> | null;
}

interface CanvasEdge {
    id: string;
    source_node_id: string;
    target_node_id: string;
    label?: string | null;
    style: string;
    color: string;
}

interface StatusItem {
    id: string;
    name: string;
    color: string;
    category: string;
}

interface MemberItem {
    id: number;
    name: string;
    email: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    project: Project;
    whiteboards: Array<{ id: string; title: string; is_favorite: boolean; updated_at: string }>;
    currentWhiteboard: WhiteboardMeta;
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    statuses: StatusItem[];
    members: MemberItem[];
}

export default function WhiteboardPage({
    organization,
    project,
    whiteboards,
    currentWhiteboard,
    nodes: initialNodes,
    edges: initialEdges,
    statuses,
    members,
}: Props) {
    const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes);
    const [edges, setEdges] = useState<CanvasEdge[]>(initialEdges);

    // Pan & Zoom State
    const [pan, setPan] = useState({ x: currentWhiteboard.viewport_x || 0, y: currentWhiteboard.viewport_y || 0 });
    const [zoom, setZoom] = useState(currentWhiteboard.viewport_zoom || 1.0);
    const [gridType, setGridType] = useState<'dots' | 'grid' | 'blank'>((currentWhiteboard.grid_type as any) || 'dots');

    const canvasRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    // Dragging Node State
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Connection / Edge Linking Mode
    const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

    // Editing Node Modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
    const [nodeTitle, setNodeTitle] = useState('');
    const [nodeContent, setNodeContent] = useState('');
    const [nodeColor, setNodeColor] = useState('#fef08a');

    // Convert to Task Modal
    const [convertModalOpen, setConvertModalOpen] = useState(false);
    const [nodeToConvert, setNodeToConvert] = useState<CanvasNode | null>(null);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskPriority, setTaskPriority] = useState('medium');
    const [taskType, setTaskType] = useState('task');
    const [taskStatusId, setTaskStatusId] = useState(statuses[0]?.id || '');
    const [storyPoints, setStoryPoints] = useState<number | string>(3);
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [converting, setConverting] = useState(false);

    // Sync props updates
    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges]);

    // Canvas Mouse Handlers for Pan
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // If clicking directly on canvas background
        if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan({
                x: e.clientX - startPan.x,
                y: e.clientY - startPan.y,
            });
        } else if (draggingNodeId) {
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (!canvasRect) return;

            const clientX = (e.clientX - canvasRect.left - pan.x) / zoom;
            const clientY = (e.clientY - canvasRect.top - pan.y) / zoom;

            const newX = Math.round(clientX - dragOffset.x);
            const newY = Math.round(clientY - dragOffset.y);

            setNodes((prev) =>
                prev.map((n) => (n.id === draggingNodeId ? { ...n, pos_x: newX, pos_y: newY } : n))
            );
        }
    };

    const handleCanvasMouseUp = () => {
        if (isPanning) {
            setIsPanning(false);
            // Save viewport
            saveViewportState(pan.x, pan.y, zoom);
        }

        if (draggingNodeId) {
            const node = nodes.find((n) => n.id === draggingNodeId);
            if (node) {
                // Persist node position via JSON endpoint
                fetch(`/projects/${project.id}/whiteboards/${currentWhiteboard.id}/nodes/${node.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    },
                    body: JSON.stringify({
                        pos_x: node.pos_x,
                        pos_y: node.pos_y,
                    }),
                });
            }
            setDraggingNodeId(null);
        }
    };

    // Node Drag Start
    const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
        e.stopPropagation();

        if (connectingSourceId) {
            // Target node clicked in connection mode
            if (connectingSourceId !== node.id) {
                createEdgeConnection(connectingSourceId, node.id);
            }
            setConnectingSourceId(null);
            return;
        }

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        const clientX = (e.clientX - canvasRect.left - pan.x) / zoom;
        const clientY = (e.clientY - canvasRect.top - pan.y) / zoom;

        setDraggingNodeId(node.id);
        setDragOffset({
            x: clientX - node.pos_x,
            y: clientY - node.pos_y,
        });
    };

    // Create New Node
    const handleAddNode = (type: 'sticky_note' | 'idea_card' | 'shape', color: string = '#fef08a') => {
        const defaultX = Math.round((-pan.x + 300) / zoom);
        const defaultY = Math.round((-pan.y + 200) / zoom);

        fetch(`/projects/${project.id}/whiteboards/${currentWhiteboard.id}/nodes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify({
                type,
                title: type === 'sticky_note' ? 'Catatan Baru' : type === 'idea_card' ? 'Ide Fitur Baru' : 'Komponen Sistem',
                content: type === 'sticky_note' ? 'Tuliskan ide atau konsep di sini...' : 'Deskripsi arsitektur atau alur proses...',
                pos_x: defaultX,
                pos_y: defaultY,
                width: type === 'sticky_note' ? 200 : 240,
                height: type === 'sticky_note' ? 160 : 180,
                color,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.node) {
                    setNodes((prev) => [...prev, data.node]);
                }
            });
    };

    // Create Edge Connection
    const createEdgeConnection = (sourceId: string, targetId: string) => {
        fetch(`/projects/${project.id}/whiteboards/${currentWhiteboard.id}/edges`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify({
                source_node_id: sourceId,
                target_node_id: targetId,
                style: 'curved',
                color: '#3b82f6',
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.edge) {
                    setEdges((prev) => [...prev, data.edge]);
                }
            });
    };

    // Delete Node
    const handleDeleteNode = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        if (!confirm('Hapus simpul ide ini dari kanvas?')) return;

        fetch(`/projects/${project.id}/whiteboards/${currentWhiteboard.id}/nodes/${nodeId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
        }).then(() => {
            setNodes((prev) => prev.filter((n) => n.id !== nodeId));
            setEdges((prev) => prev.filter((ed) => ed.source_node_id !== nodeId && ed.target_node_id !== nodeId));
        });
    };

    // Delete Edge
    const handleDeleteEdge = (edgeId: string) => {
        if (!confirm('Hapus garis relasi ini?')) return;

        fetch(`/projects/${project.id}/whiteboards/${currentWhiteboard.id}/edges/${edgeId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
        }).then(() => {
            setEdges((prev) => prev.filter((ed) => ed.id !== edgeId));
        });
    };

    // Save Node Edit
    const handleSaveNodeEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNode) return;

        fetch(`/projects/${project.id}/whiteboards/${currentWhiteboard.id}/nodes/${selectedNode.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify({
                title: nodeTitle,
                content: nodeContent,
                color: nodeColor,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.node) {
                    setNodes((prev) => prev.map((n) => (n.id === data.node.id ? data.node : n)));
                    setEditModalOpen(false);
                }
            });
    };

    // Convert to Task Submit
    const handleConvertToTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nodeToConvert) return;
        setConverting(true);

        fetch(`/projects/${project.id}/whiteboards/${currentWhiteboard.id}/nodes/${nodeToConvert.id}/convert-to-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify({
                title: taskTitle,
                description: taskDescription,
                priority: taskPriority,
                type: taskType,
                status_id: taskStatusId,
                story_points: Number(storyPoints),
                assignee_id: assigneeId ? Number(assigneeId) : null,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setConverting(false);
                if (data.task) {
                    setNodes((prev) =>
                        prev.map((n) =>
                            n.id === nodeToConvert.id
                                ? { ...n, task_id: data.task.id, task: data.task }
                                : n
                        )
                    );
                    setConvertModalOpen(false);
                }
            })
            .catch(() => setConverting(false));
    };

    // Save Viewport State helper
    const saveViewportState = (x: number, y: number, z: number) => {
        fetch(`/projects/${project.id}/whiteboards/${currentWhiteboard.id}/viewport`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify({
                viewport_x: x,
                viewport_y: y,
                viewport_zoom: z,
            }),
        });
    };

    // Zoom Helpers
    const handleZoomIn = () => {
        const newZ = Math.min(2.0, Number((zoom + 0.15).toFixed(2)));
        setZoom(newZ);
        saveViewportState(pan.x, pan.y, newZ);
    };

    const handleZoomOut = () => {
        const newZ = Math.max(0.3, Number((zoom - 0.15).toFixed(2)));
        setZoom(newZ);
        saveViewportState(pan.x, pan.y, newZ);
    };

    const handleResetView = () => {
        setPan({ x: 0, y: 0 });
        setZoom(1.0);
        saveViewportState(0, 0, 1.0);
    };

    // Calculate Edge Path helper
    const calculateEdgePath = (edge: CanvasEdge) => {
        const source = nodes.find((n) => n.id === edge.source_node_id);
        const target = nodes.find((n) => n.id === edge.target_node_id);

        if (!source || !target) return { path: '', midX: 0, midY: 0 };

        const sx = source.pos_x + source.width / 2;
        const sy = source.pos_y + source.height / 2;
        const tx = target.pos_x + target.width / 2;
        const ty = target.pos_y + target.height / 2;

        const dx = tx - sx;
        const dy = ty - sy;
        const cx1 = sx + dx / 2;
        const cy1 = sy;
        const cx2 = sx + dx / 2;
        const cy2 = ty;

        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;

        return {
            path: `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`,
            midX,
            midY,
        };
    };

    return (
        <AppLayout>
            <Head title={`Kanvas & Ideasi - ${project.name}`} />

            <div className="space-y-4 pb-8 flex flex-col h-[calc(100vh-5rem)]">
                {/* Project Sub-Navigation Bar */}
                <div className="rounded-2xl border border-border bg-card p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-xs text-xs"
                            style={{ backgroundColor: project.color || '#3b82f6' }}
                        >
                            {project.key}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-foreground">{project.name}</h1>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    {project.key}
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Kanvas Papan Tulis Digital, Mind Map & Konversi Tiket Tugas Langsung
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                            href={`/projects/${project.id}/board`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Columns3 className="h-3.5 w-3.5" />
                            <span>Papan Kanban</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/tasks`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <ListTodo className="h-3.5 w-3.5" />
                            <span>Daftar Tugas</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/dependencies`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Workflow className="h-3.5 w-3.5" />
                            <span>Graf Dependensi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/budget`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Anggaran & Biaya</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/whiteboard`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                        >
                            <PenTool className="h-3.5 w-3.5" />
                            <span>Kanvas & Ideasi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/risks`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Risiko & Mitigasi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/settings`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Pengaturan</span>
                        </Link>
                    </div>
                </div>

                {/* Floating Canvas Toolbar */}
                <div className="flex items-center justify-between gap-2 bg-card border border-border/80 p-2 rounded-2xl shadow-xs shrink-0 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-muted-foreground px-2">Tambah Elemen:</span>

                        {/* Add Sticky Note Dropdown / Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNode('sticky_note', '#fef08a')}
                            className="text-xs h-7 gap-1.5 bg-[#fef08a]/20 border-[#fef08a]/50 text-amber-900 dark:text-amber-200"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                            <span>+ Sticky Kuning</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNode('sticky_note', '#bbf7d0')}
                            className="text-xs h-7 gap-1.5 bg-[#bbf7d0]/20 border-[#bbf7d0]/50 text-emerald-900 dark:text-emerald-200"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-emerald-500" />
                            <span>+ Sticky Hijau</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNode('sticky_note', '#bfdbfe')}
                            className="text-xs h-7 gap-1.5 bg-[#bfdbfe]/20 border-[#bfdbfe]/50 text-blue-900 dark:text-blue-200"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-blue-500" />
                            <span>+ Sticky Biru</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNode('sticky_note', '#fbcfe8')}
                            className="text-xs h-7 gap-1.5 bg-[#fbcfe8]/20 border-[#fbcfe8]/50 text-pink-900 dark:text-pink-200"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-pink-500" />
                            <span>+ Sticky Pink</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNode('idea_card', '#e2e8f0')}
                            className="text-xs h-7 gap-1.5 border-border"
                        >
                            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                            <span>+ Kartu Ide</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNode('shape', '#3b82f6')}
                            className="text-xs h-7 gap-1.5 border-border"
                        >
                            <Square className="h-3.5 w-3.5 text-blue-500" />
                            <span>+ Blok Arsitektur</span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Connector Mode Indicator / Button */}
                        <Button
                            variant={connectingSourceId ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setConnectingSourceId(connectingSourceId ? null : (nodes[0]?.id || null))}
                            className={`text-xs h-7 gap-1.5 ${connectingSourceId ? 'bg-primary text-primary-foreground animate-pulse' : ''}`}
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            <span>{connectingSourceId ? 'Klik Target Simpul...' : 'Hubungkan Relasi'}</span>
                        </Button>

                        {/* Grid Switcher */}
                        <div className="flex items-center border border-border rounded-lg overflow-hidden h-7">
                            <button
                                onClick={() => setGridType('dots')}
                                className={`px-2 h-full flex items-center justify-center text-xs ${gridType === 'dots' ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground'}`}
                                title="Grid Titik"
                            >
                                <CircleDot className="h-3 w-3" />
                            </button>
                            <button
                                onClick={() => setGridType('grid')}
                                className={`px-2 h-full flex items-center justify-center text-xs ${gridType === 'grid' ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground'}`}
                                title="Grid Kotak"
                            >
                                <Grid className="h-3 w-3" />
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center border border-border rounded-lg overflow-hidden h-7">
                            <button
                                onClick={handleZoomOut}
                                className="px-2 h-full text-xs text-muted-foreground hover:bg-muted"
                                title="Perkecil"
                            >
                                <ZoomOut className="h-3 w-3" />
                            </button>
                            <span className="px-1.5 text-[11px] font-mono font-bold text-foreground select-none">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="px-2 h-full text-xs text-muted-foreground hover:bg-muted"
                                title="Perbesar"
                            >
                                <ZoomIn className="h-3 w-3" />
                            </button>
                            <button
                                onClick={handleResetView}
                                className="px-2 h-full text-xs text-muted-foreground hover:bg-muted border-l border-border"
                                title="Reset Tampilan"
                            >
                                <Maximize2 className="h-3 w-3" />
                            </button>
                        </div>
                        {/* Live Collaborative Room Button */}
                        <Link
                            href={`/projects/${project.id}/whiteboards/${currentWhiteboard.id}/live`}
                            className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xs hover:opacity-90 transition-opacity"
                        >
                            <Radio className="h-3.5 w-3.5 animate-pulse" />
                            <span>Ruang Kolaborasi Live</span>
                        </Link>
                    </div>
                </div>

                {/* Interactive Canvas Viewport */}
                <div
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className={`flex-1 relative rounded-2xl border border-border/80 overflow-hidden select-none cursor-${isPanning ? 'grabbing' : 'default'} shadow-inner`}
                    style={{
                        backgroundColor: 'var(--background)',
                        backgroundImage:
                            gridType === 'dots'
                                ? 'radial-gradient(circle, rgba(148, 163, 184, 0.25) 1px, transparent 1px)'
                                : gridType === 'grid'
                                ? 'linear-gradient(to right, rgba(148, 163, 184, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.15) 1px, transparent 1px)'
                                : 'none',
                        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                        backgroundPosition: `${pan.x}px ${pan.y}px`,
                    }}
                >
                    {/* SVG Connector Layer */}
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: '0 0',
                        }}
                    >
                        <defs>
                            <marker
                                id="arrowhead"
                                markerWidth="10"
                                markerHeight="7"
                                refX="9"
                                refY="3.5"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                            </marker>
                        </defs>

                        {edges.map((edge) => {
                            const { path, midX, midY } = calculateEdgePath(edge);
                            if (!path) return null;

                            return (
                                <g key={edge.id} className="pointer-events-auto">
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke={edge.color || '#3b82f6'}
                                        strokeWidth="2.5"
                                        strokeDasharray={edge.style === 'dashed' ? '5,5' : 'none'}
                                        markerEnd="url(#arrowhead)"
                                        className="hover:stroke-destructive transition-colors cursor-pointer"
                                        onClick={() => handleDeleteEdge(edge.id)}
                                    />
                                    {edge.label && (
                                        <text
                                            x={midX}
                                            y={midY - 8}
                                            fill="var(--foreground)"
                                            fontSize="11"
                                            textAnchor="middle"
                                            className="font-medium bg-card px-1"
                                        >
                                            {edge.label}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* Nodes Container */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: '0 0',
                        }}
                    >
                        {nodes.map((node) => {
                            const isConnectingSource = connectingSourceId === node.id;

                            return (
                                <div
                                    key={node.id}
                                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                    className={`absolute pointer-events-auto rounded-2xl p-4 shadow-md transition-shadow cursor-grab active:cursor-grabbing border ${
                                        isConnectingSource
                                            ? 'ring-4 ring-primary ring-offset-2 scale-105'
                                            : 'hover:shadow-lg'
                                    }`}
                                    style={{
                                        left: `${node.pos_x}px`,
                                        top: `${node.pos_y}px`,
                                        width: `${node.width}px`,
                                        minHeight: `${node.height}px`,
                                        backgroundColor: node.color || '#fef08a',
                                        borderColor: isConnectingSource ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                                    }}
                                >
                                    {/* Node Header & Actions */}
                                    <div className="flex items-start justify-between gap-1 mb-2">
                                        <span className="font-bold text-xs text-slate-900 tracking-tight line-clamp-1">
                                            {node.title || 'Simpul Ide'}
                                        </span>

                                        <div className="flex items-center gap-0.5 opacity-80 hover:opacity-100">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConnectingSourceId(node.id);
                                                }}
                                                className="p-1 rounded-md hover:bg-black/10 text-slate-800"
                                                title="Hubungkan dari simpul ini"
                                            >
                                                <Share2 className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedNode(node);
                                                    setNodeTitle(node.title || '');
                                                    setNodeContent(node.content || '');
                                                    setNodeColor(node.color || '#fef08a');
                                                    setEditModalOpen(true);
                                                }}
                                                className="p-1 rounded-md hover:bg-black/10 text-slate-800"
                                                title="Edit Simpul"
                                            >
                                                <Edit3 className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteNode(e, node.id)}
                                                className="p-1 rounded-md hover:bg-black/10 text-red-600"
                                                title="Hapus Simpul"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Node Content Body */}
                                    <p className="text-xs text-slate-800/90 whitespace-pre-wrap leading-relaxed">
                                        {node.content || 'Belum ada catatan...'}
                                    </p>

                                    {/* Linked Task Indicator OR Convert Button */}
                                    <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between">
                                        {node.task ? (
                                            <div className="flex items-center gap-1.5">
                                                <Badge
                                                    className="text-[9px] font-mono font-bold bg-black/80 text-white hover:bg-black"
                                                >
                                                    {node.task.key}
                                                </Badge>
                                                <span
                                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-white font-mono"
                                                    style={{ backgroundColor: node.task.status_color || '#3b82f6' }}
                                                >
                                                    {node.task.status_name || 'Tugas Proyek'}
                                                </span>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setNodeToConvert(node);
                                                    setTaskTitle(node.title || 'Tugas dari Kanvas');
                                                    setTaskDescription(node.content || '');
                                                    setConvertModalOpen(true);
                                                }}
                                                className="w-full text-[11px] h-7 bg-white/80 hover:bg-white text-slate-900 border-black/20 font-semibold shadow-xs"
                                            >
                                                <Sparkles className="h-3 w-3 mr-1 text-primary" />
                                                <span>Konversi ke Tiket Tugas</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal: Edit Simpul Ide */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit3 className="h-5 w-5 text-primary" />
                            <span>Edit Simpul Kanvas</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Perbarui judul, isi pemikiran, dan warna latar belakang simpul.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveNodeEdit} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Judul Simpul
                            </label>
                            <Input
                                value={nodeTitle}
                                onChange={(e) => setNodeTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Isi Catatan / Deskripsi Ide
                            </label>
                            <textarea
                                value={nodeContent}
                                onChange={(e) => setNodeContent(e.target.value)}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs min-h-[100px] text-foreground"
                                placeholder="Tuliskan detail konsep..."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Warna Latar Belakang
                            </label>
                            <div className="flex items-center gap-2 flex-wrap">
                                {[
                                    { hex: '#fef08a', label: 'Kuning' },
                                    { hex: '#bbf7d0', label: 'Hijau' },
                                    { hex: '#bfdbfe', label: 'Biru' },
                                    { hex: '#fbcfe8', label: 'Pink' },
                                    { hex: '#ddd6fe', label: 'Ungu' },
                                    { hex: '#fed7aa', label: 'Oranye' },
                                    { hex: '#e2e8f0', label: 'Abu-abu' },
                                ].map((c) => (
                                    <button
                                        key={c.hex}
                                        type="button"
                                        onClick={() => setNodeColor(c.hex)}
                                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                                            nodeColor === c.hex ? 'border-primary scale-110' : 'border-transparent'
                                        }`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Konversi Simpul ke Tiket Tugas */}
            <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <Sparkles className="h-5 w-5" />
                            <span>Konversi Ide ke Tiket Tugas Proyek</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Simpul ide ini akan otomatis terdaftar sebagai tiket tugas resmi di papan proyek <strong>{project.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleConvertToTaskSubmit} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Judul Tugas
                            </label>
                            <Input
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Deskripsi Tugas
                            </label>
                            <textarea
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs min-h-[80px] text-foreground"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tipe Tiket
                                </label>
                                <Select value={taskType} onValueChange={setTaskType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="task">Task</SelectItem>
                                        <SelectItem value="story">Story</SelectItem>
                                        <SelectItem value="bug">Bug</SelectItem>
                                        <SelectItem value="epic">Epic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Prioritas
                                </label>
                                <Select value={taskPriority} onValueChange={setTaskPriority}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Status Awal
                                </label>
                                <Select value={taskStatusId} onValueChange={setTaskStatusId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Story Points
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={storyPoints}
                                    onChange={(e) => setStoryPoints(Number(e.target.value))}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Penerima Tugas (Assignee)
                            </label>
                            <Select value={assigneeId} onValueChange={setAssigneeId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pilih penerima tugas..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Belum Ditugaskan</SelectItem>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setConvertModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={converting}
                                className="bg-primary text-primary-foreground text-xs font-semibold gap-1.5"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>{converting ? 'Mengonversi...' : 'Buat Tiket Tugas'}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
