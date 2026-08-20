import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    CheckSquare,
    Command,
    Compass,
    Globe,
    Keyboard,
    LayoutGrid,
    Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function KeyboardShortcutsModal() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const isInput =
                activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement ||
                activeElement?.getAttribute('contenteditable') === 'true';

            // Press Shift + ? (which is '?') to toggle shortcuts modal
            if (!isInput && e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const categories = [
        {
            title: 'Global & Sistem',
            icon: Globe,
            shortcuts: [
                { label: 'Buka Command Palette', keys: ['Ctrl / ⌘', 'K'] },
                { label: 'Fokus Pencarian Global', keys: ['/'] },
                { label: 'Buat Tugas Baru', keys: ['C'] },
                { label: 'Tampilkan Pintasan Keyboard', keys: ['Shift', '?'] },
            ],
        },
        {
            title: 'Navigasi Cepat',
            icon: Compass,
            shortcuts: [
                { label: 'Buka Papan Kanban', keys: ['G', 'B'] },
                { label: 'Buka Daftar Proyek', keys: ['G', 'P'] },
                { label: 'Buka Kotak Masuk (Inbox)', keys: ['G', 'I'] },
                { label: 'Buka Daftar Tugas', keys: ['G', 'T'] },
                { label: 'Buka Pengaturan', keys: ['G', 'S'] },
                { label: 'Navigasi Baris Atas / Bawah', keys: ['J', 'K'] },
            ],
        },
        {
            title: 'Aksi Tugas (Task Actions)',
            icon: CheckSquare,
            shortcuts: [
                { label: 'Edit Rincian Tugas', keys: ['E'] },
                { label: 'Tugaskan ke Anggota', keys: ['M'] },
                { label: 'Ubah Status Alur Kerja', keys: ['S'] },
                { label: 'Atur Prioritas Tugas', keys: ['P'] },
                { label: 'Arsipkan / Hapus Tugas', keys: ['Del'] },
            ],
        },
        {
            title: 'Pergantian Tampilan (Views)',
            icon: LayoutGrid,
            shortcuts: [
                { label: 'Tampilan Papan Kanban', keys: ['1'] },
                { label: 'Tampilan Tabel / List', keys: ['2'] },
                { label: 'Tampilan Gantt Timeline', keys: ['3'] },
                { label: 'Tampilan Kalender Tim', keys: ['4'] },
            ],
        },
    ];

    const filteredCategories = categories
        .map((cat) => ({
            ...cat,
            shortcuts: cat.shortcuts.filter((s) =>
                s.label.toLowerCase().includes(search.toLowerCase()) ||
                s.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()))
            ),
        }))
        .filter((cat) => cat.shortcuts.length > 0);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-muted/30 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <Keyboard className="size-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold">Pintasan Keyboard (Keybindings)</DialogTitle>
                            <p className="text-xs text-muted-foreground">
                                Navigasi dan kelola workspace lebih cepat dengan kombinasi tombol shortcut.
                            </p>
                        </div>
                    </div>

                    <div className="relative mt-4">
                        <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            type="text"
                            placeholder="Cari pintasan keyboard atau perintah..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs"
                            autoFocus
                        />
                    </div>
                </DialogHeader>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground">
                            Tidak ada pintasan yang cocok dengan "{search}".
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredCategories.map((cat) => {
                                const IconComponent = cat.icon;
                                return (
                                    <div
                                        key={cat.title}
                                        className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-3"
                                    >
                                        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-primary flex items-center gap-2 pb-1 border-b border-border">
                                            <IconComponent className="size-3.5" />
                                            {cat.title}
                                        </h3>

                                        <ul className="space-y-2 text-xs">
                                            {cat.shortcuts.map((shortcut, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                                                >
                                                    <span className="text-foreground">{shortcut.label}</span>
                                                    <div className="flex items-center gap-1">
                                                        {shortcut.keys.map((k, kIdx) => (
                                                            <React.Fragment key={kIdx}>
                                                                <kbd className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded border border-border shadow-2xs font-semibold text-foreground">
                                                                    {k}
                                                                </kbd>
                                                                {kIdx < shortcut.keys.length - 1 && (
                                                                    <span className="text-[10px] text-muted-foreground">+</span>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
