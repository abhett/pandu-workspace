<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CloudCostAnomaly extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'cloud_cost_anomalies';

    protected $fillable = [
        'organization_id',
        'provider',
        'service_name',
        'anomaly_date',
        'actual_cost',
        'expected_cost',
        'spike_percentage',
        'severity',
        'root_cause_analysis',
        'status',
        'resolved_by',
        'resolution_notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'anomaly_date' => 'date',
            'actual_cost' => 'decimal:2',
            'expected_cost' => 'decimal:2',
            'spike_percentage' => 'float',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
