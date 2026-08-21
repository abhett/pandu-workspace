<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CloudCostSnapshot extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'cloud_cost_snapshots';

    protected $fillable = [
        'organization_id',
        'project_id',
        'provider',
        'service_name',
        'category',
        'region',
        'cost_amount',
        'currency',
        'usage_quantity',
        'usage_unit',
        'snapshot_date',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cost_amount' => 'decimal:2',
            'usage_quantity' => 'float',
            'snapshot_date' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
