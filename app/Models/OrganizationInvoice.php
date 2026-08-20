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
 * @property string $invoice_number
 * @property int $amount_cents
 * @property string $currency
 * @property string $status
 * @property string $plan_tier
 * @property Carbon|null $paid_at
 * @property Carbon|null $due_at
 * @property Carbon|null $billing_period_start
 * @property Carbon|null $billing_period_end
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'organization_id',
    'invoice_number',
    'amount_cents',
    'currency',
    'status',
    'plan_tier',
    'paid_at',
    'due_at',
    'billing_period_start',
    'billing_period_end',
    'metadata',
])]
class OrganizationInvoice extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'paid_at' => 'datetime',
            'due_at' => 'datetime',
            'billing_period_start' => 'date',
            'billing_period_end' => 'date',
            'metadata' => 'array',
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
