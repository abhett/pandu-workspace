import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Bot,
    Check,
    CheckCircle2,
    CreditCard,
    Crown,
    Database,
    Download,
    HardDrive,
    Receipt,
    Sparkles,
    Users,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageMetric {
    used: number;
    used_formatted?: string;
    used_bytes?: number;
    limit: number;
    limit_formatted?: string;
    percentage: number;
    is_near_limit?: boolean;
}

interface InvoiceItem {
    id: string;
    invoice_number: string;
    amount_formatted: string;
    status: string;
    plan_tier: string;
    paid_at_formatted: string;
    billing_period: string;
    download_url: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    subscription: {
        id: string;
        plan_tier: string;
        plan_name: string;
        status: string;
        billing_cycle: string;
        price_formatted: string;
        current_period_end_formatted: string;
        payment_method_type: string;
        payment_method_last4: string;
        payment_method_brand: string;
        billing_email: string;
    };
    usage: {
        seats: UsageMetric;
        storage: UsageMetric;
        ai_credits: UsageMetric;
        automations: UsageMetric;
    };
    invoices: InvoiceItem[];
}

export default function BillingPage({ organization, subscription, usage, invoices }: Props) {
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annually'>('annually');
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const [cardBrand, setCardBrand] = useState(subscription.payment_method_brand);
    const [cardLast4, setCardLast4] = useState(subscription.payment_method_last4);
    const [billingEmail, setBillingEmail] = useState(subscription.billing_email);

    const handleSelectPlan = (tier: string) => {
        fetch('/organization/billing/plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                plan_tier: tier,
                billing_cycle: selectedCycle,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setShowPlanModal(false);
                router.reload();
            });
    };

    const handleUpdatePayment = (e: React.FormEvent) => {
        e.preventDefault();
        fetch('/organization/billing/payment-method', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                payment_method_brand: cardBrand,
                payment_method_last4: cardLast4,
                billing_email: billingEmail,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setShowPaymentModal(false);
                router.reload();
            });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Tagihan & Penggunaan', href: '#' },
            ]}
        >
            <Head title={`Tagihan & Penggunaan - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="space-y-1 pb-2 border-b border-border">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <CreditCard className="size-6 text-primary" /> Tagihan & Penggunaan Kuota
                    </h1>
                    <p className="text-xs text-muted-foreground max-w-2xl">
                        Kelola paket langganan Anda, pantau penggunaan sumber daya real-time, dan unduh riwayat faktur resmi.
                    </p>
                </div>

                {/* Top Grid: Subscription & Overview Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Subscription Plan Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border flex flex-col justify-between shadow-xs hover:border-primary/40 transition-colors relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Crown className="size-20 text-primary" />
                        </div>

                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                    Paket Saat Ini
                                </span>
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono gap-1">
                                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Aktif
                                </Badge>
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-foreground">{subscription.plan_name}</h2>
                                <p className="text-xs text-muted-foreground">
                                    Siklus penagihan {subscription.billing_cycle === 'annually' ? 'tahunan' : 'bulanan'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-border flex flex-col gap-3 relative z-10">
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-muted-foreground">
                                    Tagihan berikutnya: {subscription.current_period_end_formatted}
                                </span>
                                <span className="text-sm font-mono font-bold text-foreground">
                                    {subscription.price_formatted}
                                </span>
                            </div>
                            <Button
                                onClick={() => setShowPlanModal(true)}
                                className="w-full text-xs font-semibold h-8 shadow-xs"
                            >
                                Tingkatkan / Ganti Paket
                            </Button>
                        </div>
                    </div>

                    {/* Metrics Cards: Active Users & Storage */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Active Users (Seats) */}
                        <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between shadow-xs space-y-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Users className="size-3.5 text-primary" /> Kursi Pengguna Aktif
                                </span>
                                <div className="flex items-baseline gap-2 pt-1">
                                    <span className="text-3xl font-bold text-foreground">{usage.seats.used}</span>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        / {usage.seats.limit} Kuota
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[11px] font-mono">
                                    <span className="text-muted-foreground">Kapasitas {usage.seats.percentage}%</span>
                                    {usage.seats.is_near_limit && (
                                        <span className="text-amber-400 font-semibold">Hampir Penuh</span>
                                    )}
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            'h-full rounded-full transition-all',
                                            usage.seats.is_near_limit ? 'bg-amber-400' : 'bg-primary'
                                        )}
                                        style={{ width: `${Math.min(usage.seats.percentage, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Storage Usage */}
                        <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between shadow-xs space-y-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Database className="size-3.5 text-emerald-400" /> Kapasitas Penyimpanan
                                </span>
                                <div className="flex items-baseline gap-2 pt-1">
                                    <span className="text-3xl font-bold text-foreground">{usage.storage.used_formatted}</span>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        / {usage.storage.limit_formatted}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[11px] font-mono">
                                    <span className="text-muted-foreground">Terpakai {usage.storage.percentage}%</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-400 rounded-full transition-all"
                                        style={{ width: `${Math.min(usage.storage.percentage, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Grid: AI Credits & Automation Runs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* AI Intelligence Credits */}
                    <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Sparkles className="size-3.5 text-primary" /> Token AI & Wawasan Cerdas
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Penggunaan token Gemini / Claude untuk peringkasan dan asisten tugas.
                                </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-foreground">
                                {usage.ai_credits.percentage}%
                            </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">{usage.ai_credits.used_formatted}</span>
                            <span className="text-xs font-mono text-muted-foreground">
                                / {usage.ai_credits.limit_formatted} Token
                            </span>
                        </div>

                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${Math.min(usage.ai_credits.percentage, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Automation Runs */}
                    <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Zap className="size-3.5 text-amber-400" /> Eksekusi Otomasi Bulanan
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Pemicu aturan alur kerja dan integrasi webhook otomatis.
                                </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-foreground">
                                {usage.automations.percentage}%
                            </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">{usage.automations.used_formatted}</span>
                            <span className="text-xs font-mono text-muted-foreground">
                                / {usage.automations.limit_formatted} Runs
                            </span>
                        </div>

                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-400 rounded-full transition-all"
                                style={{ width: `${Math.min(usage.automations.percentage, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Payment Method & Invoices */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Payment Method Card */}
                    <div className="lg:col-span-4 bg-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <CreditCard className="size-4 text-primary" /> Metode Pembayaran
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPaymentModal(true)}
                                className="text-xs h-7"
                            >
                                Perbarui
                            </Button>
                        </div>

                        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-foreground">
                                    {subscription.payment_method_brand}
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    •••• {subscription.payment_method_last4}
                                </Badge>
                            </div>

                            <div className="text-[11px] font-mono text-muted-foreground">
                                Email Penagihan: <br />
                                <span className="text-foreground font-semibold">{subscription.billing_email}</span>
                            </div>
                        </div>
                    </div>

                    {/* Invoice History Table */}
                    <div className="lg:col-span-8 bg-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Receipt className="size-4 text-emerald-400" /> Riwayat Faktur Penagihan
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Unduh kuitansi resmi untuk keperluan pembukuan keuangan.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[10px] uppercase">
                                        <th className="py-2.5 px-3 font-semibold">Nomor Faktur</th>
                                        <th className="py-2.5 px-3 font-semibold">Paket</th>
                                        <th className="py-2.5 px-3 font-semibold">Tanggal Bayar</th>
                                        <th className="py-2.5 px-3 font-semibold">Jumlah</th>
                                        <th className="py-2.5 px-3 font-semibold">Status</th>
                                        <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-2.5 px-3 font-mono font-semibold text-foreground">
                                                {inv.invoice_number}
                                            </td>
                                            <td className="py-2.5 px-3 text-muted-foreground">
                                                {inv.plan_tier}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-muted-foreground">
                                                {inv.paid_at_formatted}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono font-semibold text-foreground">
                                                {inv.amount_formatted}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-mono">
                                                    Lunas
                                                </Badge>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <a
                                                    href={inv.download_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors inline-block"
                                                    title="Lihat Faktur"
                                                >
                                                    <Download className="size-3.5" />
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plan Switcher Modal */}
            <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-center">
                            Pilih Paket Langganan Workspace
                        </DialogTitle>
                    </DialogHeader>

                    {/* Cycle Toggle */}
                    <div className="flex justify-center my-2">
                        <div className="flex items-center rounded-xl bg-muted p-1 border border-border text-xs">
                            <button
                                onClick={() => setSelectedCycle('monthly')}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg font-semibold transition-colors',
                                    selectedCycle === 'monthly' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                                )}
                            >
                                Bulanan
                            </button>
                            <button
                                onClick={() => setSelectedCycle('annually')}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5',
                                    selectedCycle === 'annually' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
                                )}
                            >
                                <span>Tahunan</span>
                                <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1 py-0 border-none">
                                    Hemat 20%
                                </Badge>
                            </button>
                        </div>
                    </div>

                    {/* 3 Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                        {/* Starter */}
                        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4">
                            <div className="space-y-2">
                                <h4 className="font-bold text-foreground text-sm">Starter</h4>
                                <div className="text-2xl font-bold text-foreground">
                                    Rp 0 <span className="text-xs font-normal text-muted-foreground">/ bln</span>
                                </div>
                                <ul className="space-y-1.5 text-xs text-muted-foreground pt-2">
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> Hingga 10 Anggota</li>
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> 20 GB Penyimpanan</li>
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> 1M Token AI</li>
                                </ul>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => handleSelectPlan('starter')}
                                className="w-full text-xs font-semibold h-8"
                            >
                                Pilih Starter
                            </Button>
                        </div>

                        {/* Pro Growth */}
                        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4">
                            <div className="space-y-2">
                                <h4 className="font-bold text-foreground text-sm">Pro Growth</h4>
                                <div className="text-2xl font-bold text-foreground">
                                    {selectedCycle === 'annually' ? 'Rp 500.000' : 'Rp 650.000'} <span className="text-xs font-normal text-muted-foreground">/ bln</span>
                                </div>
                                <ul className="space-y-1.5 text-xs text-muted-foreground pt-2">
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> Hingga 25 Anggota</li>
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> 50 GB Penyimpanan</li>
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> 5M Token AI</li>
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> Otomasi Alur Kerja</li>
                                </ul>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => handleSelectPlan('pro')}
                                className="w-full text-xs font-semibold h-8"
                            >
                                Pilih Pro Growth
                            </Button>
                        </div>

                        {/* Enterprise Plus */}
                        <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary flex flex-col justify-between space-y-4 shadow-sm relative">
                            <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[9px] font-mono">
                                Direkomendasikan
                            </Badge>
                            <div className="space-y-2">
                                <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                    <Crown className="size-3.5 text-primary" /> Enterprise Plus
                                </h4>
                                <div className="text-2xl font-bold text-foreground">
                                    {selectedCycle === 'annually' ? 'Rp 1.250.000' : 'Rp 1.500.000'} <span className="text-xs font-normal text-muted-foreground">/ bln</span>
                                </div>
                                <ul className="space-y-1.5 text-xs text-muted-foreground pt-2">
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> Hingga 50+ Anggota</li>
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> 100 GB Penyimpanan</li>
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> 10M Token AI</li>
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> SSO SAML 2.0 & OIDC</li>
                                    <li className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> Audit Log Lengkap</li>
                                </ul>
                            </div>
                            <Button
                                onClick={() => handleSelectPlan('enterprise')}
                                className="w-full text-xs font-semibold h-8 shadow-xs"
                            >
                                Aktifkan Enterprise
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowPlanModal(false)} className="text-xs">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Method Modal */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <CreditCard className="size-4 text-primary" /> Perbarui Metode Pembayaran
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleUpdatePayment} className="space-y-4 py-2 text-xs">
                        <div className="space-y-1">
                            <label className="font-semibold text-foreground">Penyedia Kartu / Bank</label>
                            <Input
                                type="text"
                                value={cardBrand}
                                onChange={(e) => setCardBrand(e.target.value)}
                                placeholder="Mastercard / Visa / BCA"
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-semibold text-foreground">4 Digit Terakhir Kartu</label>
                            <Input
                                type="text"
                                maxLength={4}
                                value={cardLast4}
                                onChange={(e) => setCardLast4(e.target.value)}
                                placeholder="4920"
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-semibold text-foreground">Email Penerima Tagihan (Billing Email)</label>
                            <Input
                                type="email"
                                value={billingEmail}
                                onChange={(e) => setBillingEmail(e.target.value)}
                                placeholder="finance@perusahaan.com"
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)} className="text-xs">
                                Batal
                            </Button>
                            <Button type="submit" className="text-xs font-semibold">
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
