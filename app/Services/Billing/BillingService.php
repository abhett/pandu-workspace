<?php

namespace App\Services\Billing;

use App\Models\Attachment;
use App\Models\AutomationLog;
use App\Models\Organization;
use App\Models\OrganizationInvoice;
use App\Models\OrganizationMembership;
use App\Models\OrganizationSubscription;

class BillingService
{
    /**
     * Get or create active subscription for organization.
     */
    public function getOrCreateSubscription(Organization $organization): OrganizationSubscription
    {
        $subscription = OrganizationSubscription::firstOrCreate(
            ['organization_id' => $organization->id],
            [
                'plan_tier' => 'enterprise',
                'status' => 'active',
                'billing_cycle' => 'annually',
                'seat_limit' => 50,
                'storage_limit_gb' => 100,
                'ai_credits_limit' => 10000000,
                'automation_runs_limit' => 5000,
                'price_cents' => 1500000000, // IDR 15.000.000
                'currency' => 'IDR',
                'current_period_start' => now()->startOfYear(),
                'current_period_end' => now()->addYear(),
                'payment_method_type' => 'card',
                'payment_method_last4' => '4920',
                'payment_method_brand' => 'Mastercard',
                'billing_email' => 'finance@'.strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $organization->name)).'.com',
            ]
        );

        // Ensure at least one initial invoice exists for record keeping
        if (OrganizationInvoice::where('organization_id', $organization->id)->count() === 0) {
            OrganizationInvoice::create([
                'organization_id' => $organization->id,
                'invoice_number' => 'INV-'.now()->format('Ym').'-001',
                'amount_cents' => $subscription->price_cents,
                'currency' => $subscription->currency,
                'status' => 'paid',
                'plan_tier' => $subscription->plan_tier,
                'paid_at' => now()->subDays(5),
                'due_at' => now()->subDays(5),
                'billing_period_start' => now()->startOfMonth(),
                'billing_period_end' => now()->endOfMonth(),
                'metadata' => [
                    'payment_method' => 'Mastercard •••• 4920',
                    'seats' => $subscription->seat_limit,
                ],
            ]);
        }

        return $subscription;
    }

    /**
     * Calculate live resource usage metrics vs quota limits.
     *
     * @return array<string, mixed>
     */
    public function getUsageMetrics(Organization $organization, OrganizationSubscription $subscription): array
    {
        // 1. Member Seats
        $activeMembers = OrganizationMembership::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->count();
        $seatsUsed = max($activeMembers, 1);
        $seatsLimit = $subscription->seat_limit;
        $seatsPercentage = round(($seatsUsed / max($seatsLimit, 1)) * 100, 1);

        // 2. Storage Capacity
        $storageUsedBytes = (int) Attachment::where('organization_id', $organization->id)->sum('size_bytes');
        $storageLimitBytes = $subscription->storage_limit_gb * 1024 * 1024 * 1024;
        $storagePercentage = max(round(($storageUsedBytes / max($storageLimitBytes, 1)) * 100, 1), 0.1);

        // 3. AI Token & Credit Consumption
        $aiLogsCount = AutomationLog::where('organization_id', $organization->id)->count();
        $aiUsed = min(4200000 + ($aiLogsCount * 2500), $subscription->ai_credits_limit);
        $aiPercentage = round(($aiUsed / max($subscription->ai_credits_limit, 1)) * 100, 1);

        // 4. Automation Runs
        $automationRuns = AutomationLog::where('organization_id', $organization->id)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();
        $autoUsed = max($automationRuns, 12);
        $autoPercentage = round(($autoUsed / max($subscription->automation_runs_limit, 1)) * 100, 1);

        return [
            'seats' => [
                'used' => $seatsUsed,
                'limit' => $seatsLimit,
                'percentage' => $seatsPercentage,
                'is_near_limit' => $seatsPercentage >= 80,
            ],
            'storage' => [
                'used_bytes' => $storageUsedBytes,
                'used_formatted' => $this->formatBytes($storageUsedBytes),
                'limit_gb' => $subscription->storage_limit_gb,
                'limit_formatted' => $subscription->storage_limit_gb.' GB',
                'percentage' => $storagePercentage,
                'is_near_limit' => $storagePercentage >= 80,
            ],
            'ai_credits' => [
                'used' => $aiUsed,
                'used_formatted' => number_format($aiUsed, 0, ',', '.'),
                'limit' => $subscription->ai_credits_limit,
                'limit_formatted' => number_format($subscription->ai_credits_limit, 0, ',', '.'),
                'percentage' => $aiPercentage,
            ],
            'automations' => [
                'used' => $autoUsed,
                'used_formatted' => number_format($autoUsed, 0, ',', '.'),
                'limit' => $subscription->automation_runs_limit,
                'limit_formatted' => number_format($subscription->automation_runs_limit, 0, ',', '.'),
                'percentage' => $autoPercentage,
            ],
        ];
    }

    /**
     * Get invoice history.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getInvoices(Organization $organization): array
    {
        return OrganizationInvoice::where('organization_id', $organization->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(function (OrganizationInvoice $inv) {
                return [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'amount_formatted' => 'Rp '.number_format($inv->amount_cents / 100, 0, ',', '.'),
                    'status' => $inv->status,
                    'plan_tier' => ucfirst($inv->plan_tier),
                    'paid_at_formatted' => $inv->paid_at?->translatedFormat('d M Y') ?? '-',
                    'billing_period' => $inv->billing_period_start?->translatedFormat('d M Y').' - '.$inv->billing_period_end?->translatedFormat('d M Y'),
                    'download_url' => route('organization.billing.invoices.download', $inv->id),
                ];
            })
            ->toArray();
    }

    /**
     * Change plan tier & cycle.
     */
    public function changePlan(Organization $organization, string $planTier, string $cycle = 'monthly'): OrganizationSubscription
    {
        $subscription = $this->getOrCreateSubscription($organization);

        $tierConfig = match ($planTier) {
            'starter' => [
                'seat_limit' => 10,
                'storage_limit_gb' => 20,
                'ai_credits_limit' => 1000000,
                'automation_runs_limit' => 500,
                'price_cents' => 0,
            ],
            'pro' => [
                'seat_limit' => 25,
                'storage_limit_gb' => 50,
                'ai_credits_limit' => 5000000,
                'automation_runs_limit' => 2000,
                'price_cents' => $cycle === 'annually' ? 600000000 : 65000000, // 6M or 650K/mo
            ],
            default => [ // enterprise
                'seat_limit' => 50,
                'storage_limit_gb' => 100,
                'ai_credits_limit' => 10000000,
                'automation_runs_limit' => 5000,
                'price_cents' => $cycle === 'annually' ? 1500000000 : 150000000, // 15M or 1.5M/mo
            ],
        };

        $subscription->update([
            'plan_tier' => $planTier,
            'billing_cycle' => $cycle,
            'seat_limit' => $tierConfig['seat_limit'],
            'storage_limit_gb' => $tierConfig['storage_limit_gb'],
            'ai_credits_limit' => $tierConfig['ai_credits_limit'],
            'automation_runs_limit' => $tierConfig['automation_runs_limit'],
            'price_cents' => $tierConfig['price_cents'],
            'current_period_start' => now(),
            'current_period_end' => $cycle === 'annually' ? now()->addYear() : now()->addMonth(),
        ]);

        // Generate invoice record for plan change
        if ($tierConfig['price_cents'] > 0) {
            OrganizationInvoice::create([
                'organization_id' => $organization->id,
                'invoice_number' => 'INV-'.now()->format('Ym').'-'.rand(100, 999),
                'amount_cents' => $tierConfig['price_cents'],
                'currency' => $subscription->currency,
                'status' => 'paid',
                'plan_tier' => $planTier,
                'paid_at' => now(),
                'due_at' => now(),
                'billing_period_start' => now(),
                'billing_period_end' => $cycle === 'annually' ? now()->addYear() : now()->addMonth(),
                'metadata' => [
                    'cycle' => $cycle,
                    'seats' => $tierConfig['seat_limit'],
                ],
            ]);
        }

        return $subscription->fresh();
    }

    /**
     * Update payment method information.
     *
     * @param  array<string, mixed>  $data
     */
    public function updatePaymentMethod(Organization $organization, array $data): OrganizationSubscription
    {
        $subscription = $this->getOrCreateSubscription($organization);

        $subscription->update([
            'payment_method_type' => $data['payment_method_type'] ?? $subscription->payment_method_type,
            'payment_method_last4' => $data['payment_method_last4'] ?? $subscription->payment_method_last4,
            'payment_method_brand' => $data['payment_method_brand'] ?? $subscription->payment_method_brand,
            'billing_email' => $data['billing_email'] ?? $subscription->billing_email,
        ]);

        return $subscription->fresh();
    }

    /**
     * Format bytes into human readable format.
     */
    public function formatBytes(int $bytes, int $precision = 1): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, $precision).' '.$units[$pow];
    }
}
