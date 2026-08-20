import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    requiredConfirmationText: string;
    actionButtonLabel: string;
    onConfirm: () => void;
    isDestructive?: boolean;
}

export default function HighSecurityConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    requiredConfirmationText,
    actionButtonLabel,
    onConfirm,
    isDestructive = true,
}: Props) {
    const [inputValue, setInputValue] = useState('');
    const isConfirmed = inputValue.trim() === requiredConfirmationText.trim();

    const handleConfirm = () => {
        if (isConfirmed) {
            onConfirm();
            setInputValue('');
            onOpenChange(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(newOpen) => {
                if (!newOpen) setInputValue('');
                onOpenChange(newOpen);
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                            <ShieldAlert className="size-5" />
                        </div>
                        <div>
                            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-destructive">
                                Tindakan Berisiko Tinggi
                            </div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                {title}
                            </DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                    <div className="p-3.5 bg-destructive/5 border-l-4 border-destructive rounded-r-xl space-y-1.5">
                        <p className="text-foreground leading-relaxed">
                            {description}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                            Ketik <span className="font-mono text-destructive font-bold bg-destructive/10 px-1.5 py-0.5 rounded select-all">{requiredConfirmationText}</span> untuk mengonfirmasi.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="font-semibold text-foreground">Konfirmasi Teks Keamanan</label>
                        <Input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={`Ketik ${requiredConfirmationText}...`}
                            className="font-mono text-xs"
                            autoFocus
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        variant={isDestructive ? 'destructive' : 'default'}
                        disabled={!isConfirmed}
                        onClick={handleConfirm}
                        className="text-xs font-semibold gap-1.5 shadow-xs"
                    >
                        <AlertTriangle className="size-3.5" />
                        {actionButtonLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
