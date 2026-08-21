<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CloudCostRecommendation extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'cloud_cost_recommendations';

    protected $fillable = [
        'organization_id',
        'provider',
        'title',
        'description',
        'resource_id',
        'action_type',
        'estimated_monthly_savings',
        'currency',
        'status',
        'applied_by',
        'applied_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'estimated_monthly_savings' => 'decimal:2',
            'applied_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function applier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applied_by');
    }
}
