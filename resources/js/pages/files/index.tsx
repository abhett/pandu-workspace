import React, { useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
    Clock,
    CloudUpload,
    Code,
    Download,
    Eye,
    File,
    FileArchive,
    FileCode,
    FileText,
    Folder as FolderIcon,
    FolderPlus,
    Grid,
    HardDrive,
    Image as ImageIcon,
    LayoutGrid,
    List,
    MoreVertical,
    Paperclip,
    Plus,
    Search,
    Trash2,
    Upload,
    User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderItem {
    id: string;
    organization_id: string;
    project_id: string | null;
    parent_id: string | null;
    name: string;
    color: string;
    files_count?: number;
}

interface FileItem {
    id: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
    size_formatted: string;
    url: string | null;
    download_url: string;
    folder: { id: string; name: string; color: string } | null;
    project: { id: string; name: string; key: string } | null;
    uploader: { id: number; name: string; avatar?: string } | null;
    created_at: string;
    created_at_formatted: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    project: {
        id: string;
        name: string;
        key: string;
    } | null;
    folders: FolderItem[];
    files: FileItem[];
    storage: {
        used_bytes: number;
        used_formatted: string;
        quota_bytes: number;
        quota_formatted: string;
        percentage: number;
    };
    total_items: number;
    filters: {
        view: string;
        folder_id?: string;
        search?: string;
        type?: string;
    };
}

export default function FileManagerPage({ organization, project, folders, files, storage, total_items, filters }: Props) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState(filters.search || '');
    const [fileType, setFileType] = useState(filters.type || 'all');
    const [selectedView, setSelectedView] = useState(filters.view || 'all');
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(filters.folder_id || null);

    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderColor, setNewFolderColor] = useState('blue');

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const applyFilter = (newView?: string, newFolderId?: string | null, newType?: string) => {
        const v = newView !== undefined ? newView : selectedView;
        const f = newFolderId !== undefined ? newFolderId : selectedFolderId;
        const t = newType !== undefined ? newType : fileType;

        setSelectedView(v);
        setSelectedFolderId(f);
        setFileType(t);

        router.get(
            '/files',
            {
                view: v !== 'all' ? v : undefined,
                folder_id: f || undefined,
                type: t !== 'all' ? t : undefined,
                search: search || undefined,
            },
            { preserveState: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = e.target.files;
        if (!uploadedFiles || uploadedFiles.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', uploadedFiles[0]);
        if (selectedFolderId) {
            formData.append('folder_id', selectedFolderId);
        }
        if (project?.id) {
            formData.append('project_id', project.id);
        }

        fetch('/files/upload', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: formData,
        })
            .then((res) => res.json())
            .then(() => {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                router.reload();
            })
            .catch(() => setIsUploading(false));
    };

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        fetch('/files/folders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: newFolderName,
                color: newFolderColor,
                project_id: project?.id || null,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setShowNewFolderModal(false);
                setNewFolderName('');
                router.reload();
            });
    };

    const handleDeleteFile = (file: FileItem) => {
        if (!confirm(`Hapus berkas "${file.filename}"?`)) return;

        fetch(`/files/${file.id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                if (selectedFile?.id === file.id) setSelectedFile(null);
                router.reload();
            });
    };

    const getFileIcon = (mime: string) => {
        if (mime.startsWith('image/')) return <ImageIcon className="size-5 text-emerald-400" />;
        if (mime.includes('pdf')) return <FileText className="size-5 text-red-400" />;
        if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar'))
            return <FileArchive className="size-5 text-amber-400" />;
        if (mime.includes('javascript') || mime.includes('json') || mime.includes('code'))
            return <FileCode className="size-5 text-blue-400" />;
        return <File className="size-5 text-primary" />;
    };

    const getFolderColorClass = (color: string) => {
        switch (color) {
            case 'emerald':
                return 'text-emerald-400';
            case 'amber':
                return 'text-amber-400';
            case 'red':
                return 'text-red-400';
            case 'purple':
                return 'text-purple-400';
            default:
                return 'text-blue-400';
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: project?.name || 'Aset & Media', href: '#' },
                { title: 'Manajemen Berkas', href: '#' },
            ]}
        >
            <Head title={`Manajemen Berkas - ${organization.name}`} />

            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-background">
                {/* LEFT SIDEBAR: Quick Views, Folders & Storage Quota */}
                <aside className="w-full lg:w-64 bg-card/60 border-r border-border flex flex-col shrink-0 overflow-y-auto max-h-[calc(100vh-64px)]">
                    <div className="p-4 space-y-4 flex-1">
                        {/* Hidden Native File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        {/* Upload Button */}
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full text-xs font-semibold h-9 gap-2 shadow-sm"
                        >
                            <CloudUpload className="size-4" />
                            <span>{isUploading ? 'Mengunggah...' : 'Unggah Berkas'}</span>
                        </Button>

                        {/* Quick Views */}
                        <div className="space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground px-2">
                                Tampilan Cepat
                            </span>
                            <div className="space-y-0.5">
                                {[
                                    { id: 'all', label: 'Semua Berkas', icon: FolderIcon },
                                    { id: 'recent', label: 'Terbaru (7 Hari)', icon: Clock },
                                    { id: 'attachments', label: 'Lampiran Tugas', icon: Paperclip },
                                    { id: 'trash', label: 'Sampah Terhapus', icon: Trash2 },
                                ].map((qv) => {
                                    const Icon = qv.icon;
                                    const isSelected = selectedView === qv.id && selectedFolderId === null;

                                    return (
                                        <button
                                            key={qv.id}
                                            onClick={() => applyFilter(qv.id, null)}
                                            className={cn(
                                                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left',
                                                isSelected
                                                    ? 'bg-primary/10 text-primary font-bold'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                            )}
                                        >
                                            <Icon className="size-4 shrink-0" />
                                            <span>{qv.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Project Folders */}
                        <div className="space-y-1 pt-2 border-t border-border/40">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                    Folder Proyek
                                </span>
                                <button
                                    onClick={() => setShowNewFolderModal(true)}
                                    className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                                    title="Tambah Folder"
                                >
                                    <FolderPlus className="size-3.5" />
                                </button>
                            </div>

                            <div className="space-y-0.5">
                                {folders.map((folder) => {
                                    const isSelected = selectedFolderId === folder.id;

                                    return (
                                        <button
                                            key={folder.id}
                                            onClick={() => applyFilter('all', folder.id)}
                                            className={cn(
                                                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left',
                                                isSelected
                                                    ? 'bg-primary/10 text-primary font-bold'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                            )}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <FolderIcon className={cn('size-4 shrink-0', getFolderColorClass(folder.color))} />
                                                <span className="truncate">{folder.name}</span>
                                            </div>
                                            <span className="text-[10px] font-mono opacity-60">
                                                {folder.files_count ?? 0}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Storage Usage Footer */}
                    <div className="p-4 border-t border-border bg-muted/20 space-y-2">
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <HardDrive className="size-3.5 text-primary" /> Kapasitas
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                                {storage.used_formatted} / {storage.quota_formatted}
                            </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-primary h-1.5 rounded-full transition-all"
                                style={{ width: `${Math.min(storage.percentage, 100)}%` }}
                            />
                        </div>
                    </div>
                </aside>

                {/* MAIN FILE AREA */}
                <main className="flex-1 flex flex-col overflow-y-auto max-h-[calc(100vh-64px)]">
                    {/* Top Action Toolbar */}
                    <div className="p-4 border-b border-border bg-card/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-foreground tracking-tight">
                                {selectedFolderId
                                    ? folders.find((f) => f.id === selectedFolderId)?.name || 'Folder Berkas'
                                    : selectedView === 'recent'
                                    ? 'Berkas Terbaru'
                                    : selectedView === 'attachments'
                                    ? 'Lampiran Tugas'
                                    : selectedView === 'trash'
                                    ? 'Sampah Terhapus'
                                    : 'Semua Berkas'}
                            </h1>
                            <Badge variant="outline" className="text-[10px] font-mono">
                                {total_items} Berkas
                            </Badge>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {/* Search */}
                            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-56">
                                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari nama berkas..."
                                    className="pl-8 text-xs font-mono h-8 bg-card"
                                />
                            </form>

                            {/* Type Filter */}
                            <select
                                value={fileType}
                                onChange={(e) => applyFilter(undefined, undefined, e.target.value)}
                                className="h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                <option value="all">Semua Tipe</option>
                                <option value="image">Gambar</option>
                                <option value="document">Dokumen</option>
                                <option value="archive">Arsip (ZIP)</option>
                            </select>

                            {/* View Mode Toggle */}
                            <div className="flex items-center rounded-xl bg-card border border-border p-0.5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        'p-1.5 rounded-lg transition-colors',
                                        viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    title="Tampilan Grid"
                                >
                                    <LayoutGrid className="size-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        'p-1.5 rounded-lg transition-colors',
                                        viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    title="Tampilan List"
                                >
                                    <List className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Files Container */}
                    <div className="p-6 flex-1">
                        {files.length > 0 ? (
                            viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {files.map((file) => (
                                        <div
                                            key={file.id}
                                            onClick={() => setSelectedFile(file)}
                                            className="bg-card hover:bg-muted/20 border border-border rounded-2xl p-3 flex flex-col gap-2 cursor-pointer transition-all shadow-2xs hover:shadow-md group relative overflow-hidden"
                                        >
                                            {/* Preview Thumbnail */}
                                            <div className="h-28 rounded-xl bg-muted/40 flex items-center justify-center overflow-hidden relative border border-border/40">
                                                {file.url ? (
                                                    <img
                                                        src={file.url}
                                                        alt={file.filename}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                                        {getFileIcon(file.mime_type)}
                                                        <span className="text-[9px] font-mono uppercase font-bold">
                                                            {file.filename.split('.').pop()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-semibold text-foreground truncate block" title={file.filename}>
                                                    {file.filename}
                                                </span>
                                                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                                                    <span>{file.size_formatted}</span>
                                                    <span>{file.created_at_formatted.split(',')[0]}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-card rounded-2xl border border-border shadow-2xs overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[10px] uppercase">
                                                <th className="py-2.5 px-4 font-semibold">Nama Berkas</th>
                                                <th className="py-2.5 px-4 font-semibold">Folder</th>
                                                <th className="py-2.5 px-4 font-semibold">Ukuran</th>
                                                <th className="py-2.5 px-4 font-semibold">Pengunggah</th>
                                                <th className="py-2.5 px-4 font-semibold">Tanggal</th>
                                                <th className="py-2.5 px-4 font-semibold text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {files.map((file) => (
                                                <tr
                                                    key={file.id}
                                                    onClick={() => setSelectedFile(file)}
                                                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                                                >
                                                    <td className="py-2.5 px-4">
                                                        <div className="flex items-center gap-2">
                                                            {getFileIcon(file.mime_type)}
                                                            <span className="font-semibold text-foreground truncate max-w-xs">
                                                                {file.filename}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                                                        {file.folder?.name || '-'}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                                                        {file.size_formatted}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-foreground text-[11px]">
                                                        {file.uploader?.name || 'Sistem'}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                                                        {file.created_at_formatted}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right">
                                                        <a
                                                            href={file.download_url}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors inline-block"
                                                            title="Unduh"
                                                        >
                                                            <Download className="size-3.5" />
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 text-muted-foreground border border-dashed border-border rounded-2xl">
                                <FolderIcon className="size-12 stroke-[1.5]" />
                                <div className="space-y-1">
                                    <h3 className="font-bold text-base text-foreground">Tidak Ada Berkas</h3>
                                    <p className="text-xs">Unggah berkas atau pilih kategori folder lain.</p>
                                </div>
                                <Button onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold gap-1.5">
                                    <CloudUpload className="size-3.5" />
                                    <span>Unggah Berkas Sekarang</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* File Preview & Metadata Dialog */}
            <Dialog open={selectedFile !== null} onOpenChange={(open) => !open && setSelectedFile(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 truncate">
                            {selectedFile && getFileIcon(selectedFile.mime_type)}
                            <span className="truncate">{selectedFile?.filename}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedFile && (
                        <div className="space-y-4 py-2 text-xs">
                            {/* Preview Area */}
                            <div className="max-h-64 rounded-xl bg-muted/60 flex items-center justify-center overflow-hidden border border-border">
                                {selectedFile.url ? (
                                    <img
                                        src={selectedFile.url}
                                        alt={selectedFile.filename}
                                        className="max-h-64 w-full object-contain"
                                    />
                                ) : (
                                    <div className="p-8 flex flex-col items-center gap-2 text-muted-foreground">
                                        {getFileIcon(selectedFile.mime_type)}
                                        <span className="font-mono text-xs">{selectedFile.mime_type}</span>
                                    </div>
                                )}
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 font-mono text-[11px] border border-border">
                                <div>
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Ukuran</span>
                                    <span className="font-semibold text-foreground">{selectedFile.size_formatted}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Format / MIME</span>
                                    <span className="font-semibold text-foreground truncate block">{selectedFile.mime_type}</span>
                                </div>
                                <div className="pt-2">
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Diunggah Oleh</span>
                                    <span className="font-semibold text-foreground">{selectedFile.uploader?.name || 'Sistem'}</span>
                                </div>
                                <div className="pt-2">
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Tanggal Unggah</span>
                                    <span className="font-semibold text-foreground">{selectedFile.created_at_formatted}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex justify-between items-center w-full">
                        {selectedFile && (
                            <button
                                type="button"
                                onClick={() => handleDeleteFile(selectedFile)}
                                className="p-2 text-muted-foreground hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                title="Hapus Berkas"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        )}

                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => setSelectedFile(null)} className="text-xs">
                                Tutup
                            </Button>
                            {selectedFile && (
                                <a href={selectedFile.download_url}>
                                    <Button type="button" className="text-xs font-semibold gap-1.5">
                                        <Download className="size-3.5" />
                                        <span>Unduh Berkas</span>
                                    </Button>
                                </a>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Folder Dialog */}
            <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <FolderPlus className="size-4 text-primary" /> Buat Folder Proyek Baru
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateFolder} className="space-y-4 py-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">Nama Folder</label>
                            <Input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Contoh: Design Mockups, Sprint Docs..."
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">Warna Ikon Folder</label>
                            <select
                                value={newFolderColor}
                                onChange={(e) => setNewFolderColor(e.target.value)}
                                className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                <option value="blue">Biru (Blue)</option>
                                <option value="emerald">Hijau (Emerald)</option>
                                <option value="amber">Kuning (Amber)</option>
                                <option value="red">Merah (Red)</option>
                                <option value="purple">Ungu (Purple)</option>
                            </select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowNewFolderModal(false)} className="text-xs">
                                Batal
                            </Button>
                            <Button type="submit" className="text-xs font-semibold">
                                Buat Folder
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
