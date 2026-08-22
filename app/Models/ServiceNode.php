<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceNode extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'service_nodes';

    protected $fillable = [
        'organization_id',
        'name',
        'service_type',
        'environment',
        'status',
        'throughput_rpm',
        'error_rate_pct',
        'p95_latency_ms',
        'p99_latency_ms',
        'dependencies',
        'metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'throughput_rpm' => 'integer',
            'error_rate_pct' => 'float',
            'p95_latency_ms' => 'integer',
            'p99_latency_ms' => 'integer',
            'dependencies' => 'array',
            'metadata' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
