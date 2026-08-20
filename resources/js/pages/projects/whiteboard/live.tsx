import React, { useState, useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Radio,
    Sparkles,
    StickyNote,
    Lightbulb,
    Share2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    CircleDot,
    Grid,
    Trash2,
    Check,
    X,
    Users,
    Activity,
    ArrowLeft,
    CheckCircle2,
    Move,
    Flame,
    ThumbsUp,
    Heart,
    Rocket,
    PartyPopper,
    Send,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface WhiteboardMeta {
    id: string;
    title: string;
    description: string | null;
    viewport_x: number;
    viewport_y: number;
    viewport_zoom: number;
    grid_type: string;
}

interface WhiteboardNodeItem {
    id: string;
    type: string;
    title: string;
    content: string | null;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    color: string | null;
    task_id: string | null;
    task?: {
        id: string;
        key: string;
        title: string;
        priority: string;
        type: string;
        status_name?: string;
        status_color?: string;
    } | null;
}

interface WhiteboardEdgeItem {
    id: string;
    source_node_id: string;
    target_node_id: string;
    label: string | null;
    style: string;
    color: string | null;
}

interface CollaboratorPresence {
    id: string;
    user_id: number;
    user_name: string;
    user_email?: string;
    cursor_x: number | null;
    cursor_y: number | null;
    selected_node_id: string | null;
    locked_node_id: string | null;
    client_color: string;
    is_current_user: boolean;
    last_active_at: string;
}

interface FloatingReaction {
    id: string;
    emoji: string;
    user_name: string;
    x: number;
    y: number;
}

interface Props {
    project: Project;
    whiteboard: WhiteboardMeta;
    nodes: WhiteboardNodeItem[];
    edges: WhiteboardEdgeItem[];
    initial_presence: {
        collaborators: CollaboratorPresence[];
        active_count: number;
        current_user_color: string;
    };
}

export default function WhiteboardLiveRoom({
    project,
    whiteboard,
    nodes: initialNodes,
    edges: initialEdges,
    initial_presence,
}: Props) {
    const [nodes, setNodes] = useState<WhiteboardNodeItem[]>(initialNodes);
    const [edges, setEdges] = useState<WhiteboardEdgeItem[]>(initialEdges);
    const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>(initial_presence.collaborators);
    const [userColor, setUserColor] = useState<string>(initial_presence.current_user_color);

    const [pan, setPan] = useState({ x: whiteboard.viewport_x || 0, y: whiteboard.viewport_y || 0 });
    const [zoom, setZoom] = useState(whiteboard.viewport_zoom || 1.0);
    const [gridType, setGridType] = useState<'dots' | 'grid' | 'blank'>((whiteboard.grid_type as any) || 'dots');

    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
    const [editingNode, setEditingNode] = useState<WhiteboardNodeItem | null>(null);

    // Floating Live Reactions
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

    const canvasRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // 1. Presence Heartbeat & Poll every 1.5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetch(`/projects/${project.id}/whiteboards/${whiteboard.id}/live/presence`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    cursor_x: cursorRef.current.x,
                    cursor_y: cursorRef.current.y,
                    selected_node_id: selectedNodeId,
                    locked_node_id: draggingNodeId,
                    client_color: userColor,
                }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.presence?.collaborators) {
                        setCollaborators(data.presence.collaborators);
                        if (data.presence.current_user_color) {
                            setUserColor(data.presence.current_user_color);
                        }
                    }
                })
                .catch(() => {});
        }, 1500);

        // Leave room cleanup on unmount
        return () => {
            clearInterval(interval);
            fetch(`/projects/${project.id}/whiteboards/${whiteboard.id}/live/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            }).catch(() => {});
        };
    }, [project.id, whiteboard.id, selectedNodeId, draggingNodeId, userColor]);

    // Canvas panning & cursor tracking
    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - pan.x) / zoom;
        const worldY = (e.clientY - rect.top - pan.y) / zoom;

        cursorRef.current = { x: Math.round(worldX), y: Math.round(worldY) };

        if (isPanning) {
            setPan({
                x: e.clientX - startPan.x,
                y: e.clientY - startPan.y,
            });
            return;
        }

        if (draggingNodeId) {
            setNodes((prev) =>
                prev.map((n) =>
                    n.id === draggingNodeId
                        ? {
                              ...n,
                              pos_x: Math.round(worldX - dragOffset.x),
                              pos_y: Math.round(worldY - dragOffset.y),
                          }
                        : n
                )
            );
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && e.target === canvasRef.current) {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            setSelectedNodeId(null);
            setConnectingSourceId(null);
        }
    };

    const handleCanvasMouseUp = () => {
        if (isPanning) {
            setIsPanning(false);
        }

        if (draggingNodeId) {
            // Save node pos via sync
            const movedNode = nodes.find((n) => n.id === draggingNodeId);
            if (movedNode) {
                fetch(`/projects/${project.id}/whiteboards/${whiteboard.id}/live/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({
                        nodes: [
                            {
                                id: movedNode.id,
                                pos_x: movedNode.pos_x,
                                pos_y: movedNode.pos_y,
                            },
                        ],
                    }),
                });
            }

            // Release lock
            fetch(`/projects/${project.id}/whiteboards/${whiteboard.id}/live/lock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    node_id: draggingNodeId,
                    action: 'unlock',
                }),
            });

            setDraggingNodeId(null);
        }
    };

    // Node Drag Start with Lock
    const handleNodeMouseDown = (e: React.MouseEvent, node: WhiteboardNodeItem) => {
        e.stopPropagation();

        // If in connecting mode
        if (connectingSourceId) {
            if (connectingSourceId !== node.id) {
                // Create connector edge
                fetch(`/projects/${project.id}/whiteboards/${whiteboard.id}/live/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({
                        new_edges: [
                            {
                                source_node_id: connectingSourceId,
                                target_node_id: node.id,
                                label: null,
                                style: 'smoothstep',
                                color: '#6366f1',
                            },
                        ],
                    }),
                })
                    .then((res) => res.json())
                    .then((data) => {
                        if (data.edges) setEdges(data.edges);
                        setConnectingSourceId(null);
                    });
            }
            return;
        }

        // Acquire lock
        fetch(`/projects/${project.id}/whiteboards/${whiteboard.id}/live/lock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                node_id: node.id,
                action: 'lock',
            }),
        })
            .then((res) => {
                if (res.ok) {
                    if (!canvasRef.current) return;
                    const rect = canvasRef.current.getBoundingClientRect();
                    const worldX = (e.clientX - rect.left - pan.x) / zoom;
                    const worldY = (e.clientY - rect.top - pan.y) / zoom;

                    setDraggingNodeId(node.id);
                    setSelectedNodeId(node.id);
                    setDragOffset({
                        x: worldX - node.pos_x,
                        y: worldY - node.pos_y,
                    });
                }
            });
    };

    // Add New Sticky Note
    const handleAddSticky = (color: string = '#fef08a') => {
        const spawnX = -pan.x / zoom + 300;
        const spawnY = -pan.y / zoom + 200;

        fetch(`/projects/${project.id}/whiteboards/${whiteboard.id}/live/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                new_nodes: [
                    {
                        type: 'sticky_note',
                        title: 'Catatan Kolaborasi',
                        content: 'Tulis ide di sini...',
                        pos_x: spawnX,
                        pos_y: spawnY,
                        width: 200,
                        height: 160,
                        color: color,
                    },
                ],
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.nodes) setNodes(data.nodes);
            });
    };

    // Trigger Floating Reaction
    const handleSendReaction = (emoji: string) => {
        const newReaction: FloatingReaction = {
            id: Math.random().toString(),
            emoji,
            user_name: 'Anda',
            x: window.innerWidth / 2 + (Math.random() * 200 - 100),
            y: window.innerHeight - 150,
        };

        setFloatingReactions((prev) => [...prev, newReaction]);

        setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
        }, 2000);
    };

    // Render Curved Edge Path
    const renderEdgePath = (edge: WhiteboardEdgeItem) => {
        const source = nodes.find((n) => n.id === edge.source_node_id);
        const target = nodes.find((n) => n.id === edge.target_node_id);
        if (!source || !target) return null;

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

        return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
    };

    return (
        <AppLayout>
            <Head title={`Live Collab - ${whiteboard.title}`} />

            <div className="flex flex-col h-[calc(100vh-4.5rem)] space-y-3 pb-4">
                {/* Header Bar */}
                <div className="rounded-2xl border border-border bg-card p-3 shadow-sm flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/projects/${project.id}/whiteboard`}
                            className="p-1.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>

                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                            <Radio className="h-4 w-4 animate-pulse" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-bold text-foreground">{whiteboard.title}</h1>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 py-0 font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    <span>LIVE</span>
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Ruang kanvas tersinkronisasi real-time dengan multi-cursor presence
                            </p>
                        </div>
                    </div>

                    {/* Active Collaborators Bar */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center -space-x-2 overflow-hidden">
                            {collaborators.map((c) => (
                                <div
                                    key={c.id}
                                    title={`${c.user_name} (${c.is_current_user ? 'Anda' : 'Online'})`}
                                    className="w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-white text-[11px] font-bold shadow-xs relative"
                                    style={{ backgroundColor: c.client_color }}
                                >
                                    {c.user_name.charAt(0).toUpperCase()}
                                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border-2 border-card" />
                                </div>
                            ))}
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground font-mono">
                            {collaborators.length} Kolaborator Aktif
                        </span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="rounded-2xl border border-border bg-card p-2 shadow-xs flex items-center justify-between gap-3 shrink-0 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground mr-1">Tambah:</span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddSticky('#fef08a')}
                            className="text-xs h-7 gap-1 bg-[#fef08a]/30 border-[#fef08a]/60 text-amber-900 dark:text-amber-200"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                            <span>Kuning</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddSticky('#bbf7d0')}
                            className="text-xs h-7 gap-1 bg-[#bbf7d0]/30 border-[#bbf7d0]/60 text-emerald-900 dark:text-emerald-200"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Hijau</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddSticky('#bfdbfe')}
                            className="text-xs h-7 gap-1 bg-[#bfdbfe]/30 border-[#bfdbfe]/60 text-blue-900 dark:text-blue-200"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-blue-500" />
                            <span>Biru</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddSticky('#fbcfe8')}
                            className="text-xs h-7 gap-1 bg-[#fbcfe8]/30 border-[#fbcfe8]/60 text-pink-900 dark:text-pink-200"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-pink-500" />
                            <span>Pink</span>
                        </Button>

                        <div className="h-4 w-px bg-border mx-1" />

                        <Button
                            variant={connectingSourceId ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setConnectingSourceId(connectingSourceId ? null : (nodes[0]?.id || null))}
                            className={`text-xs h-7 gap-1 ${connectingSourceId ? 'bg-primary text-primary-foreground animate-pulse' : ''}`}
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            <span>{connectingSourceId ? 'Pilih Target Simpul...' : 'Hubungkan Simpul'}</span>
                        </Button>
                    </div>

                    {/* Quick Floating Reactions Tray */}
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/80">
                        <span className="text-[10px] text-muted-foreground font-semibold px-1">Reaksi:</span>
                        {['🔥', '👍', '💡', '🚀', '❤️', '🎉'].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => handleSendReaction(emoji)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-card text-xs transition-transform active:scale-125"
                                title={`Kirim ${emoji}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Interactive Collaborative Canvas */}
                <div
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className={`flex-1 relative rounded-3xl border border-border/80 overflow-hidden select-none cursor-${isPanning ? 'grabbing' : 'default'} shadow-inner`}
                    style={{
                        backgroundColor: 'var(--background)',
                        backgroundImage:
                            gridType === 'dots'
                                ? 'radial-gradient(circle, rgba(148, 163, 184, 0.25) 1px, transparent 1px)'
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
                        {edges.map((edge) => {
                            const d = renderEdgePath(edge);
                            if (!d) return null;
                            return (
                                <g key={edge.id}>
                                    <path
                                        d={d}
                                        fill="none"
                                        stroke={edge.color || '#6366f1'}
                                        strokeWidth={2.5}
                                        strokeDasharray={edge.style === 'dashed' ? '5,5' : 'none'}
                                        className="transition-all"
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Nodes Layer */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: '0 0',
                        }}
                    >
                        {nodes.map((node) => {
                            const isSelected = selectedNodeId === node.id;
                            const isConnectingSource = connectingSourceId === node.id;

                            // Check if node is locked by another collaborator
                            const lockedBy = collaborators.find(
                                (c) => c.locked_node_id === node.id && !c.is_current_user
                            );

                            return (
                                <div
                                    key={node.id}
                                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                    className={`absolute pointer-events-auto rounded-2xl p-4 shadow-md transition-shadow cursor-grab active:cursor-grabbing border ${
                                        lockedBy
                                            ? 'ring-2 ring-rose-500 animate-pulse'
                                            : isSelected
                                            ? 'ring-2 ring-primary shadow-xl'
                                            : isConnectingSource
                                            ? 'ring-2 ring-primary border-primary animate-pulse'
                                            : 'border-border/60 hover:shadow-lg'
                                    }`}
                                    style={{
                                        transform: `translate(${node.pos_x}px, ${node.pos_y}px)`,
                                        width: `${node.width}px`,
                                        minHeight: `${node.height}px`,
                                        backgroundColor: node.color || '#fef08a',
                                    }}
                                >
                                    {/* Lock Indicator Badge */}
                                    {lockedBy && (
                                        <div className="absolute -top-3 left-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold shadow-xs flex items-center gap-1">
                                            <span>Diedit {lockedBy.user_name}</span>
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between gap-1 mb-1">
                                        <h4 className="font-bold text-xs text-foreground leading-tight">
                                            {node.title}
                                        </h4>
                                    </div>

                                    <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                        {node.content}
                                    </p>

                                    {node.task && (
                                        <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-mono">
                                            <span className="font-bold">{node.task.key}</span>
                                            <span>{node.task.status_name}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Multi-Cursor Presence Layer */}
                    {collaborators
                        .filter((c) => !c.is_current_user && c.cursor_x !== null && c.cursor_y !== null)
                        .map((c) => {
                            const screenX = pan.x + (c.cursor_x || 0) * zoom;
                            const screenY = pan.y + (c.cursor_y || 0) * zoom;

                            return (
                                <div
                                    key={c.id}
                                    className="absolute pointer-events-none transition-all duration-100 ease-out z-50 flex items-center gap-1.5"
                                    style={{
                                        transform: `translate(${screenX}px, ${screenY}px)`,
                                    }}
                                >
                                    {/* Custom SVG Mouse Pointer */}
                                    <svg
                                        className="w-4 h-4 drop-shadow-md"
                                        viewBox="0 0 24 24"
                                        fill={c.client_color}
                                        stroke="#ffffff"
                                        strokeWidth="1.5"
                                    >
                                        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
                                    </svg>

                                    {/* User Name Pill */}
                                    <div
                                        className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold shadow-md whitespace-nowrap"
                                        style={{ backgroundColor: c.client_color }}
                                    >
                                        {c.user_name}
                                    </div>
                                </div>
                            );
                        })}

                    {/* Floating Reaction Animations */}
                    {floatingReactions.map((r) => (
                        <div
                            key={r.id}
                            className="absolute pointer-events-none animate-bounce text-2xl z-50 transition-all duration-1000"
                            style={{
                                left: `${r.x}px`,
                                top: `${r.y}px`,
                            }}
                        >
                            {r.emoji}
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
