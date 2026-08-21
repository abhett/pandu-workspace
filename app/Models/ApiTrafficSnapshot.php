<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiTrafficSnapshot extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'api_traffic_snapshots';

    protected $fillable = [
        'organization_id',
        'policy_id',
        'endpoint_route',
        'client_identifier',
        'total_requests',
        'throttled_requests',
        'avg_latency_ms',
        'status_2xx_count',
        'status_4xx_count',
        'status_5xx_count',
        'recorded_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_requests' => 'integer',
            'throttled_requests' => 'integer',
            'avg_latency_ms' => 'float',
            'status_2xx_count' => 'integer',
            'status_4xx_count' => 'integer',
            'status_5xx_count' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(ApiRateLimitPolicy::class, 'policy_id');
    }
}
