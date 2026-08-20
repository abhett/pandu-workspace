<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationInvoice;
use App\Services\Billing\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    protected function authorizeBillingAccess($user, $organization): void
    {
        if (! in_array($user->roleInOrganization($organization), ['owner']) && ! $user->hasPermissionInOrganization($organization, 'org:billing')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola tagihan organisasi.');
        }
    }

    /**
     * Display Organization Billing, Quotas & Invoice Management page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeBillingAccess($user, $organization);

        $subscription = $this->billingService->getOrCreateSubscription($organization);
        $usage = $this->billingService->getUsageMetrics($organization, $subscription);
        $invoices = $this->billingService->getInvoices($organization);

        return Inertia::render('organization/billing', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'subscription' => [
                'id' => $subscription->id,
                'plan_tier' => $subscription->plan_tier,
                'plan_name' => match ($subscription->plan_tier) {
                    'starter' => 'Starter Tier',
                    'pro' => 'Pro Growth',
                    default => 'Enterprise Plus',
                },
                'status' => $subscription->status,
                'billing_cycle' => $subscription->billing_cycle,
                'price_formatted' => 'Rp '.number_format($subscription->price_cents / 100, 0, ',', '.'),
                'current_period_end_formatted' => $subscription->current_period_end?->translatedFormat('d M Y') ?? '12 Nov 2026',
                'payment_method_type' => $subscription->payment_method_type,
                'payment_method_last4' => $subscription->payment_method_last4 ?? '4920',
                'payment_method_brand' => $subscription->payment_method_brand ?? 'Mastercard',
                'billing_email' => $subscription->billing_email ?? $user->email,
            ],
            'usage' => $usage,
            'invoices' => $invoices,
        ]);
    }

    /**
     * Change subscription plan tier or billing cycle.
     */
    public function changePlan(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeBillingAccess($user, $organization);

        $validated = $request->validate([
            'plan_tier' => ['required', 'string', 'in:starter,pro,enterprise'],
            'billing_cycle' => ['required', 'string', 'in:monthly,annually'],
        ]);

        $this->billingService->changePlan($organization, $validated['plan_tier'], $validated['billing_cycle']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Paket langganan berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Paket langganan berhasil diperbarui.');
    }

    /**
     * Update payment method details.
     */
    public function updatePaymentMethod(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeBillingAccess($user, $organization);

        $validated = $request->validate([
            'payment_method_brand' => ['required', 'string', 'max:50'],
            'payment_method_last4' => ['required', 'string', 'size:4'],
            'billing_email' => ['required', 'email', 'max:255'],
        ]);

        $this->billingService->updatePaymentMethod($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Metode pembayaran berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Metode pembayaran berhasil diperbarui.');
    }

    /**
     * Download an invoice receipt.
     */
    public function downloadInvoice(Request $request, OrganizationInvoice $invoice): HttpResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeBillingAccess($user, $organization);

        if ($invoice->organization_id !== $organization->id) {
            abort(404);
        }

        $amountFormatted = 'Rp '.number_format($invoice->amount_cents / 100, 0, ',', '.');
        $paidDate = $invoice->paid_at?->format('d F Y') ?? date('d F Y');

        $html = <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Faktur Penagihan - {$invoice->invoice_number}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: 800; color: #4f46e5; }
        .badge { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        th { background: #f8fafc; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #64748b; }
        .total { text-align: right; font-size: 18px; font-weight: 700; margin-top: 20px; color: #0f172a; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">PANDU WMS</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">PT Pandu Digital Nusantara</div>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 700;">{$invoice->invoice_number}</div>
            <div style="margin-top: 6px;"><span class="badge">Lunas / Paid</span></div>
        </div>
    </div>

    <div class="details">
        <div>
            <strong>Ditagihkan Kepada:</strong><br>
            {$organization->name}<br>
            Email: {$user->email}
        </div>
        <div style="text-align: right;">
            <strong>Tanggal Pembayaran:</strong> {$paidDate}<br>
            <strong>Metode Pembayaran:</strong> Kartu Kredit / Transfer
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Deskripsi Layanan</th>
                <th>Paket</th>
                <th>Periode</th>
                <th style="text-align: right;">Jumlah</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Langganan Pandu WMS Enterprise Workspace</td>
                <td>{$invoice->plan_tier}</td>
                <td>Bulanan / Tahunan</td>
                <td style="text-align: right;">{$amountFormatted}</td>
            </tr>
        </tbody>
    </table>

    <div class="total">
        Total Tagihan: {$amountFormatted}
    </div>
</body>
</html>
HTML;

        return response($html, 200, [
            'Content-Type' => 'text/html',
            'Content-Disposition' => 'inline; filename="invoice-'.$invoice->invoice_number.'.html"',
        ]);
    }
}
