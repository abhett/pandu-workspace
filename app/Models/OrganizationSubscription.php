<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property string $plan_tier
 * @property string $status
 * @property string $billing_cycle
 * @property int $seat_limit
 * @property int $storage_limit_gb
 * @property int $ai_credits_limit
 * @property int $automation_runs_limit
 * @property int $price_cents
 * @property string $currency
 * @property Carbon|null $current_period_start
 * @property Carbon|null $current_period_end
 * @property string $payment_method_type
 * @property string|null $payment_method_last4
 * @property string|null $payment_method_brand
 * @property string|null $billing_email
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'organization_id',
    'plan_tier',
    'status',
    'billing_cycle',
    'seat_limit',
    'storage_limit_gb',
    'ai_credits_limit',
    'automation_runs_limit',
    'price_cents',
    'currency',
    'current_period_start',
    'current_period_end',
    'payment_method_type',
    'payment_method_last4',
    'payment_method_brand',
    'billing_email',
])]
class OrganizationSubscription extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'seat_limit' => 'integer',
            'storage_limit_gb' => 'integer',
            'ai_credits_limit' => 'integer',
            'automation_runs_limit' => 'integer',
            'price_cents' => 'integer',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
